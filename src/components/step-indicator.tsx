type Step = {
  label: string;
};

type StepIndicatorProps = {
  steps: Step[];
  currentStep: number; // 1-indexed
};

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center border-b border-ui-border px-6 py-3.5">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === currentStep;
        const isComplete = stepNum < currentStep;

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.625rem] font-bold ${
                  isActive
                    ? "bg-action text-white"
                    : isComplete
                      ? "bg-action/20 text-action"
                      : "border border-tint text-muted"
                }`}
              >
                {isComplete ? "✓" : stepNum}
              </div>
              <span
                className={`text-[0.6875rem] font-semibold uppercase tracking-[0.1em] ${
                  isActive
                    ? "text-ink"
                    : isComplete
                      ? "text-ink-secondary"
                      : "text-muted"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className="mx-3 h-px min-w-[2rem] flex-1 bg-ui-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}
