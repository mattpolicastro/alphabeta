import type { AnalysisRequest, AnalysisResponse, WorkerMessage } from './types';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useEngineStatusStore } from '@/lib/store/engineStatusStore';
import { useLoadingStore } from '@/lib/store/loadingStore';

/**
 * Unified entry point — routes to Pyodide Web Worker (Path A) or Lambda (Path B)
 * based on the user's compute engine setting stored in IndexedDB.
 * See requirements.md Section 2.3.
 */
export async function runAnalysis(
  request: AnalysisRequest,
): Promise<AnalysisResponse> {
  const { computeEngine } = useSettingsStore.getState();
  const { startLoading, stopLoading } = useLoadingStore.getState();

  startLoading();
  try {
    if (computeEngine === 'wasm') {
      return await runAnalysisInWorker(request);
    } else {
      return await runAnalysisInLambda(request);
    }
  } finally {
    stopLoading();
  }
}

// ----- Path A: Pyodide Web Worker -----

let statsWorker: Worker | null = null;

// Pending analysis promise callbacks — only one analysis at a time
let pendingResolve: ((value: AnalysisResponse) => void) | null = null;
let pendingReject: ((reason: Error) => void) | null = null;

/**
 * Terminate the existing stats worker (if any) and reset engine status to
 * uninitialised. The next call to runAnalysis will create a fresh worker.
 */
export function terminateStatsWorker(): void {
  if (statsWorker) {
    statsWorker.terminate();
    statsWorker = null;
  }
  // Reject any in-flight analysis
  pendingReject?.(new Error('Worker terminated by user'));
  pendingResolve = null;
  pendingReject = null;
  useEngineStatusStore.getState().setStatus('uninitialised', '');
}

function getOrCreateStatsWorker(): Worker {
  if (statsWorker) return statsWorker;

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const worker = new Worker(`${basePath}/stats-worker.js`);

  // Persistent listener — handles both status updates and analysis results
  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;

    if (msg.type === 'status') {
      if (msg.message.includes('ready')) {
        useEngineStatusStore.getState().setStatus('ready', msg.message);
      } else {
        useEngineStatusStore.getState().setStatus('loading', msg.message);
      }
    }

    if (msg.type === 'result') {
      useEngineStatusStore.getState().setStatus('ready', 'Analysis complete');
      pendingResolve?.(msg.data);
      pendingResolve = null;
      pendingReject = null;
    }

    if (msg.type === 'error') {
      useEngineStatusStore.getState().setStatus('error', msg.message);
      pendingReject?.(new Error(msg.message));
      pendingResolve = null;
      pendingReject = null;
    }
  };

  worker.onerror = (err) => {
    useEngineStatusStore.getState().setStatus('error', err.message);
    pendingReject?.(new Error(`Worker error: ${err.message}`));
    pendingResolve = null;
    pendingReject = null;
    // Destroy crashed worker so it reinitialises on next call
    statsWorker = null;
  };

  statsWorker = worker;
  return worker;
}

function runAnalysisInWorker(
  request: AnalysisRequest,
): Promise<AnalysisResponse> {
  return new Promise((resolve, reject) => {
    const worker = getOrCreateStatsWorker();
    pendingResolve = resolve;
    pendingReject = reject;
    worker.postMessage(request);
  });
}

// ----- Path B: Lambda Function URL -----

async function runAnalysisInLambda(
  request: AnalysisRequest,
): Promise<AnalysisResponse> {
  const { lambdaUrl } = useSettingsStore.getState();

  if (!lambdaUrl) {
    throw new Error(
      'Lambda Function URL is not configured. Set it in Settings → Compute Engine.',
    );
  }

  const res = await fetch(lambdaUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `Lambda error ${res.status}`,
    );
  }

  return res.json() as Promise<AnalysisResponse>;
}
