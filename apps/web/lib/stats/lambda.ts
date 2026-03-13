/**
 * Lambda client module (Path B).
 * The actual fetch logic lives in runAnalysis.ts — this module provides
 * Lambda-specific utilities like connection testing.
 * See requirements.md Section 9.2.
 */

/**
 * Tests connectivity to the Lambda Function URL.
 * Used by the "Test connection" button in Settings.
 */
export async function testLambdaConnection(url: string): Promise<boolean> {
  // TODO: send a lightweight OPTIONS or health-check request to the Lambda URL
  // Return true if reachable, false otherwise
  // Should handle CORS, timeouts, and network errors gracefully
  try {
    const res = await fetch(url, {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(5000),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}
