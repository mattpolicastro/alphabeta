'use client';

import { useEffect, useState } from 'react';
import { useLoadingStore } from '@/lib/store/loadingStore';

/**
 * A fixed-position top progress bar that appears when any async operation
 * tracked by the loading store has been active for >500ms.
 * Uses Bootstrap 5 classes only.
 */
export function GlobalLoadingIndicator() {
  const isLoading = useLoadingStore((s) => s.isLoading);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (isLoading) {
      // Delay showing the indicator so brief operations don't flash
      timer = setTimeout(() => setVisible(true), 500);
    } else {
      setVisible(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100"
      style={{ zIndex: 1080, height: '3px' }}
    >
      <div
        className="progress"
        style={{ height: '3px', borderRadius: 0, backgroundColor: 'transparent' }}
      >
        <div
          className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
          role="progressbar"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
