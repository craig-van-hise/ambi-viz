/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import React, { useContext } from 'react';
import { OnboardingProvider, OnboardingContext } from '../OnboardingContext';

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

const TestComponent = () => {
  const context = useContext(OnboardingContext);
  if (!context) return <div data-testid="no-context">No Context</div>;
  return (
    <div>
      <span data-testid="step">{context.currentStep}</span>
      <button data-testid="advance" onClick={context.advanceStep}>
        Advance
      </button>
      <button data-testid="reset" onClick={(context as any).resetOnboarding}>
        Reset
      </button>
    </div>
  );
};

describe('OnboardingContext (Phase 1)', () => {
  it('Given a first-time load, When the provider mounts, Assert the state initializes to HEADPHONES', () => {
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );
    expect(screen.getByTestId('step').textContent).toBe('HEADPHONES');
  });

  it('Given the user has completed onboarding before, When the provider mounts, Assert the state initializes to COMPLETED', () => {
    localStorage.setItem('ambiviz_onboarding_completed', 'true');
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );
    expect(screen.getByTestId('step').textContent).toBe('COMPLETED');
  });

  it('Given the state is COMPLETED, When resetOnboarding() is called, Assert that the localStorage key is removed and the state becomes HEADPHONES', () => {
    localStorage.setItem('ambiviz_onboarding_completed', 'true');
    render(
      <OnboardingProvider>
        <TestComponent />
      </OnboardingProvider>
    );
    expect(screen.getByTestId('step').textContent).toBe('COMPLETED');
    
    const resetBtn = screen.getByTestId('reset');
    fireEvent.click(resetBtn);
    
    expect(screen.getByTestId('step').textContent).toBe('HEADPHONES');
    expect(localStorage.getItem('ambiviz_onboarding_completed')).toBeNull();
  });
});
