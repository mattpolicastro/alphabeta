/**
 * Unit tests for the runAnalysis dispatcher (Path A: WASM worker, Path B: Lambda).
 *
 * The tests mock the global Worker constructor with a controllable fake so we
 * can drive onmessage / onerror from the test side and assert timeout, crash,
 * and restart behaviors without spinning up a real Pyodide worker.
 */

import type { AnalysisRequest, AnalysisResponse } from '../types';

// ---------- Fake Worker plumbing ----------

type WorkerListener = ((e: MessageEvent) => void) | null;

class FakeWorker {
  static instances: FakeWorker[] = [];
  static throwOnConstruct = false;

  onmessage: WorkerListener = null;
  onerror: ((e: { message: string }) => void) | null = null;
  postedMessages: unknown[] = [];
  terminated = false;

  constructor(public url: string) {
    if (FakeWorker.throwOnConstruct) {
      throw new Error('construction failed');
    }
    FakeWorker.instances.push(this);
  }

  postMessage(msg: unknown): void {
    this.postedMessages.push(msg);
  }

  terminate(): void {
    this.terminated = true;
  }

  // Test helpers — drive messages from the "worker side".
  emit(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }
  fail(message: string): void {
    this.onerror?.({ message });
  }
}

(globalThis as unknown as { Worker: typeof FakeWorker }).Worker = FakeWorker;

// Re-import after Worker is defined so module-level `new Worker` references
// pick up the fake. Modules are reset between tests via jest.resetModules.
let runAnalysis: typeof import('../runAnalysis').runAnalysis;
let terminateStatsWorker: typeof import('../runAnalysis').terminateStatsWorker;
let useSettingsStore: typeof import('@/lib/store/settingsStore').useSettingsStore;
let useEngineStatusStore: typeof import('@/lib/store/engineStatusStore').useEngineStatusStore;

function freshRequest(): AnalysisRequest {
  return {
    engine: 'bayesian',
    correction: 'none',
    alpha: 0.05,
    srmThreshold: 0.001,
    variations: [
      { id: 'c', key: 'c', weight: 0.5, isControl: true },
      { id: 't', key: 't', weight: 0.5, isControl: false },
    ],
    metrics: [{ id: 'm1', name: 'Conv', isGuardrail: false }],
    data: { overall: {}, slices: {} },
    multipleExposureCount: 0,
  };
}

const successResponse: AnalysisResponse = {
  srmPValue: 0.5,
  srmFlagged: false,
  multipleExposureFlagged: false,
  overall: [],
  slices: {},
  warnings: [],
};

/* eslint-disable @typescript-eslint/no-require-imports */
beforeEach(() => {
  jest.resetModules();
  FakeWorker.instances = [];
  FakeWorker.throwOnConstruct = false;

  // Re-import after resetModules so module-level state (statsWorker) is fresh.
  const mod = require('../runAnalysis');
  runAnalysis = mod.runAnalysis;
  terminateStatsWorker = mod.terminateStatsWorker;
  useSettingsStore = require('../../store/settingsStore').useSettingsStore;
  useEngineStatusStore =
    require('../../store/engineStatusStore').useEngineStatusStore;

  // Reset store state to known defaults.
  useSettingsStore.setState({
    computeEngine: 'wasm',
    lambdaUrl: '',
  } as never);
  useEngineStatusStore.setState({
    status: 'uninitialised',
    message: '',
    failureCount: 0,
  } as never);
});

afterEach(() => {
  jest.useRealTimers();
});
/* eslint-enable @typescript-eslint/no-require-imports */

// ---------- Path A: WASM worker ----------

describe('runAnalysis (WASM path)', () => {
  it('resolves with the response when the worker emits a result', async () => {
    const promise = runAnalysis(freshRequest());
    // One worker should have been constructed and the request posted to it.
    expect(FakeWorker.instances).toHaveLength(1);
    const worker = FakeWorker.instances[0];
    expect(worker.postedMessages).toHaveLength(1);

    worker.emit({ type: 'result', data: successResponse });
    await expect(promise).resolves.toEqual(successResponse);
    expect(useEngineStatusStore.getState().status).toBe('ready');
    expect(useEngineStatusStore.getState().failureCount).toBe(0);
  });

  it('rejects and records a failure when the worker emits an error', async () => {
    const promise = runAnalysis(freshRequest());
    const worker = FakeWorker.instances[0];
    worker.emit({ type: 'error', message: 'gbstats blew up' });
    await expect(promise).rejects.toThrow('gbstats blew up');
    const s = useEngineStatusStore.getState();
    expect(s.status).toBe('error');
    expect(s.failureCount).toBe(1);
  });

  it('rejects on worker.onerror and resets the worker so the next call creates a new one', async () => {
    const p1 = runAnalysis(freshRequest());
    const worker1 = FakeWorker.instances[0];
    worker1.fail('boom');
    await expect(p1).rejects.toThrow(/Worker error: boom/);
    expect(useEngineStatusStore.getState().status).toBe('error');

    // Next call should spin up a fresh worker.
    const p2 = runAnalysis(freshRequest());
    expect(FakeWorker.instances).toHaveLength(2);
    FakeWorker.instances[1].emit({ type: 'result', data: successResponse });
    await expect(p2).resolves.toEqual(successResponse);
  });

  it('times out after ANALYSIS_TIMEOUT_MS, terminates the worker, and records a failure', async () => {
    jest.useFakeTimers();
    const promise = runAnalysis(freshRequest());
    const worker = FakeWorker.instances[0];

    jest.advanceTimersByTime(3 * 60 * 1000 + 1);
    await expect(promise).rejects.toThrow(/timed out after 3 minutes/);
    expect(worker.terminated).toBe(true);
    const s = useEngineStatusStore.getState();
    expect(s.status).toBe('error');
    expect(s.failureCount).toBe(1);

    // A subsequent call must create a new worker (the previous was terminated).
    jest.useRealTimers();
    const p2 = runAnalysis(freshRequest());
    expect(FakeWorker.instances).toHaveLength(2);
    FakeWorker.instances[1].emit({ type: 'result', data: successResponse });
    await expect(p2).resolves.toEqual(successResponse);
  });

  it('updates engine status while loading based on status messages', async () => {
    const promise = runAnalysis(freshRequest());
    const worker = FakeWorker.instances[0];
    worker.emit({ type: 'status', message: 'Loading Pyodide...' });
    expect(useEngineStatusStore.getState().status).toBe('loading');
    worker.emit({ type: 'status', message: 'Engine ready' });
    expect(useEngineStatusStore.getState().status).toBe('ready');
    worker.emit({ type: 'result', data: successResponse });
    await promise;
  });

  it('terminateStatsWorker rejects any in-flight analysis and clears status', async () => {
    const promise = runAnalysis(freshRequest());
    expect(FakeWorker.instances[0].terminated).toBe(false);
    terminateStatsWorker();
    await expect(promise).rejects.toThrow('Worker terminated by user');
    expect(FakeWorker.instances[0].terminated).toBe(true);
    expect(useEngineStatusStore.getState().status).toBe('uninitialised');
  });
});

// ---------- Path B: Lambda ----------

describe('runAnalysis (Lambda path)', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      computeEngine: 'lambda',
      lambdaUrl: 'https://example.test/fn',
    } as never);
  });

  it('returns the parsed JSON response on HTTP 200', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => successResponse,
    }) as unknown as typeof fetch;

    await expect(runAnalysis(freshRequest())).resolves.toEqual(successResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.test/fn',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws with the server-supplied message on a 500 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'upstream exploded' }),
    }) as unknown as typeof fetch;

    await expect(runAnalysis(freshRequest())).rejects.toThrow(
      'upstream exploded',
    );
  });

  it('throws a generic status-coded error when the response body is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json');
      },
    }) as unknown as typeof fetch;

    await expect(runAnalysis(freshRequest())).rejects.toThrow('Lambda error 502');
  });

  it('propagates network errors from fetch', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    await expect(runAnalysis(freshRequest())).rejects.toThrow('ECONNREFUSED');
  });

  it('throws a configuration error when lambdaUrl is not set', async () => {
    useSettingsStore.setState({ lambdaUrl: '' } as never);
    await expect(runAnalysis(freshRequest())).rejects.toThrow(
      /Lambda Function URL is not configured/,
    );
  });
});
