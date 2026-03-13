'use client';

/**
 * Experiment list table with status and tag filtering.
 * See requirements.md Sections 5.1, 8.3.
 */

import type { Experiment } from '@/lib/db/schema';

interface ExperimentListProps {
  experiments: Experiment[];
  onClone: (id: string) => void;
}

export function ExperimentList({ experiments, onClone }: ExperimentListProps) {
  // TODO: render table with columns: Name, Status (badge), Variations, Tags, Created, Actions
  // TODO: status filter dropdown (draft / running / stopped / archived / all)
  // TODO: tag filter multi-select
  // TODO: actions: View, Clone, Archive
  // TODO: link experiment name to /experiments/[id]
  // TODO: status badge colors: draft=muted, running=primary, stopped=warning, archived=secondary

  void experiments;
  void onClone;

  return (
    <div>
      {/* TODO: filter controls */}
      {/* TODO: experiment table */}
      <p className="text-muted">ExperimentList component stub</p>
    </div>
  );
}
