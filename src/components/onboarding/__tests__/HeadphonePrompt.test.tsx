/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { OnboardingProvider, OnboardingContext } from '../OnboardingContext';
import { HeadphonePrompt } from '../HeadphonePrompt';

// Mock localStorage to ensure it is defined and clean
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const key in store) delete store[key]; },
  length: 0,
  key: () => null,
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const TestAppWithPrompt = () => {
  return (
    <OnboardingProvider>
      <OnboardingContext.Consumer>
        {(context) => (
          <div>
            <span data-testid="step">{context?.currentStep}</span>
            {context?.currentStep === 'HEADPHONES' && <HeadphonePrompt />}
          </div>
        )}
      </OnboardingContext.Consumer>
    </OnboardingProvider>
  );
};

describe('HeadphonePrompt (Phase 2)', () => {
  it('Given state is HEADPHONES, When the UI renders, Assert the HeadphonePrompt is visible', () => {
    render(<TestAppWithPrompt />);
    expect(screen.getByTestId('step').textContent).toBe('HEADPHONES');
    expect(screen.getByText(/Step 1: Put on your headphones/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /I'm wearing headphones/i })).toBeDefined();
  });

  it('Given the user clicks "I\'m wearing headphones", When the event fires, Assert the Context state transitions to TRACKING and the prompt unmounts', () => {
    render(<TestAppWithPrompt />);
    const btn = screen.getByRole('button', { name: /I'm wearing headphones/i });
    fireEvent.click(btn);
    expect(screen.getByTestId('step').textContent).toBe('TRACKING');
    expect(screen.queryByText(/Step 1: Put on your headphones/i)).toBeNull();
  });
});
