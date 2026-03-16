/**
 * Demo mode seeder — loads pre-built experiment config and metrics into IndexedDB.
 * See requirements.md Section 5.1a.
 */

import { db } from './index';
import type { Experiment, Metric } from './schema';

export async function seedDemoData(): Promise<void> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const res = await fetch(`${basePath}/demo/demo-experiment.json`);
  const demoConfig = await res.json();

  const now = Date.now();

  const metrics: Metric[] = [
    {
      id: 'm_purchases',
      name: 'Purchase Rate',
      description: 'Proportion of users who completed a purchase',
      type: 'binomial',
      normalization: 'raw_total',
      higherIsBetter: true,
      isGuardrail: false,
      tags: ['conversion'],
      createdAt: now,
    },
    {
      id: 'm_clicks',
      name: 'Click Rate',
      description: 'Proportion of users who clicked the CTA',
      type: 'count',
      normalization: 'raw_total',
      higherIsBetter: true,
      isGuardrail: false,
      tags: ['engagement'],
      createdAt: now,
    },
    {
      id: 'm_revenue',
      name: 'Revenue',
      description: 'Total revenue per variation (deferred to v2 for proper mean test)',
      type: 'revenue',
      normalization: 'raw_total',
      higherIsBetter: true,
      isGuardrail: false,
      tags: ['monetization'],
      createdAt: now,
    },
  ];

  const experiment: Experiment = {
    id: demoConfig.id,
    name: demoConfig.name,
    hypothesis: demoConfig.hypothesis,
    description: demoConfig.description,
    status: demoConfig.status,
    createdAt: demoConfig.createdAt,
    updatedAt: now,
    variations: demoConfig.variations,
    primaryMetricIds: demoConfig.primaryMetricIds,
    guardrailMetricIds: demoConfig.guardrailMetricIds ?? [],
    activationMetricId: demoConfig.activationMetricId,
    statsEngine: demoConfig.statsEngine,
    multipleComparisonCorrection: demoConfig.multipleComparisonCorrection,
    cuped: demoConfig.cuped ?? false,
    tags: demoConfig.tags ?? [],
  };

  await db.transaction('rw', [db.experiments, db.metrics], async () => {
    await db.metrics.bulkPut(metrics);
    await db.experiments.put(experiment);
  });
}
