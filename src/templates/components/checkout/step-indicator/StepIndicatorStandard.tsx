/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { jsx } from 'hono/jsx';
import type { FC } from 'hono/jsx';

export interface StepIndicatorStandardProps {
  steps: Array<{ label: string; completed?: boolean; active?: boolean }>;
  currentStep?: number;
}

/**
 * Step Indicator Standard
 *
 * Horizontal checkout progress indicator using DaisyUI steps component.
 * Steps before currentStep are marked completed; the currentStep is active.
 */
export const StepIndicatorStandard: FC<StepIndicatorStandardProps> = ({
  steps,
  currentStep,
}) => {
  const resolvedSteps = steps.map((step, i) => ({
    ...step,
    completed: step.completed ?? (currentStep !== undefined && i < currentStep),
    active: step.active ?? (currentStep !== undefined && i === currentStep),
  }));

  return (
    <nav aria-label="Checkout progress" data-controller="checkout">
      <ul class="steps steps-horizontal w-full">
        {resolvedSteps.map((step) => {
          const cls = ['step'];
          if (step.completed || step.active) cls.push('step-primary');
          return (
            <li class={cls.join(' ')} aria-current={step.active ? 'step' : undefined}>
              {step.label}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};