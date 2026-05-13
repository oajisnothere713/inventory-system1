import React from 'react';

interface StepsBarProps {
  currentStep: number;
}

export default function StepsBar({ currentStep }: StepsBarProps) {
  const steps = [
    { n: 1, label: 'Find item' },
    { n: 2, label: 'Select batch & quantity' },
    { n: 3, label: 'Issue details' },
    { n: 4, label: 'Confirm & issue' },
  ];

  return (
    <div className="steps-bar" id="stepsBar">
      {steps.map((s, idx) => {
        const state = s.n < currentStep ? 'done' : s.n === currentStep ? 'active' : 'idle';
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: idx < steps.length - 1 ? '1' : '0' }}>
            <div className="step-item">
              <div className={`step-num ${state}`}>{state === 'done' ? '✓' : s.n}</div>
              <div className={`step-label ${state}`}>{s.label}</div>
            </div>
            {idx < steps.length - 1 && (
              <div className="step-line" style={{ flex: 1 }}>
                <div className="step-line-fill" style={{ width: s.n < currentStep ? '100%' : '0%' }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
