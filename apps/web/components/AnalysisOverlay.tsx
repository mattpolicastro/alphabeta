'use client';

export type AnalysisStep = 'parsing' | 'loading-engine' | 'running-analysis' | 'saving-results';

interface AnalysisOverlayProps {
  currentStep: AnalysisStep | null;
  message?: string;
}

const STEPS: Array<{ key: AnalysisStep; label: string }> = [
  { key: 'parsing', label: 'Parsing data' },
  { key: 'loading-engine', label: 'Loading stats engine' },
  { key: 'running-analysis', label: 'Running statistical tests' },
  { key: 'saving-results', label: 'Saving results' },
];

function getStepStatus(
  stepKey: AnalysisStep,
  currentStep: AnalysisStep | null
): 'completed' | 'active' | 'pending' {
  if (!currentStep) return 'pending';

  const stepIndex = STEPS.findIndex((s) => s.key === stepKey);
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
}

function StepIndicator({ status }: { status: 'completed' | 'active' | 'pending' }) {
  if (status === 'completed') {
    return <span className="text-success fw-bold">✓</span>;
  }
  if (status === 'active') {
    return (
      <div className="spinner-border spinner-border-sm text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    );
  }
  return <span className="text-muted">○</span>;
}

export function AnalysisOverlay({ currentStep, message }: AnalysisOverlayProps) {
  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
      }}
    >
      <div className="card" style={{ maxWidth: '480px' }}>
        <div className="card-body">
          <h5 className="card-title mb-4">Running Analysis</h5>

          <ul className="list-unstyled">
            {STEPS.map((step) => {
              const status = getStepStatus(step.key, currentStep);
              const isActive = status === 'active';
              const isCompleted = status === 'completed';

              return (
                <li
                  key={step.key}
                  className={`d-flex align-items-center gap-2 py-2 ${
                    isActive ? 'fw-bold' : ''
                  } ${isCompleted ? 'text-success' : ''} ${
                    status === 'pending' ? 'text-muted' : ''
                  }`}
                >
                  <StepIndicator status={status} />
                  <span>{step.label}</span>
                </li>
              );
            })}
          </ul>

          {message && <div className="text-muted small mt-3">{message}</div>}
        </div>
      </div>
    </div>
  );
}
