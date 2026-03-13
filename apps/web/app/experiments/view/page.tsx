'use client';

/**
 * Experiment detail + upload page.
 * Reads experiment ID from ?id= query param (no dynamic route segments).
 * Reads view mode from ?view=upload query param.
 *
 * URLs:
 *   /experiments/view?id=abc123           → detail/results dashboard
 *   /experiments/view?id=abc123&view=upload → CSV upload flow
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ExperimentDetailView from './ExperimentDetailView';
import UploadView from './UploadView';
import Link from 'next/link';

function ExperimentViewInner() {
  const searchParams = useSearchParams();
  const experimentId = searchParams.get('id');
  const view = searchParams.get('view');

  if (!experimentId) {
    return (
      <div className="py-4">
        <div className="alert alert-warning">No experiment ID provided.</div>
        <Link href="/">Back to experiments</Link>
      </div>
    );
  }

  if (view === 'upload') {
    return <UploadView experimentId={experimentId} />;
  }

  return <ExperimentDetailView experimentId={experimentId} />;
}

export default function ExperimentViewPage() {
  return (
    <Suspense fallback={<div className="py-4 text-center"><div className="spinner-border" role="status" /></div>}>
      <ExperimentViewInner />
    </Suspense>
  );
}
