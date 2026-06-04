import React, { createContext, useState, useContext, ReactNode } from 'react';

export type OnboardingStep = 'HEADPHONES' | 'TRACKING' | 'PLAYBACK' | 'COMPLETED';

interface OnboardingContextProps {
  currentStep: OnboardingStep;
  advanceStep: () => void;
  resetOnboarding: () => void;
}

export const OnboardingContext = createContext<OnboardingContextProps | undefined>(undefined);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem) {
        const completed = localStorage.getItem('ambiviz_onboarding_completed');
        return completed === 'true' ? 'COMPLETED' : 'HEADPHONES';
      }
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    return 'HEADPHONES';
  });

  const advanceStep = () => {
    setCurrentStep((prev) => {
      const nextStep = (() => {
        if (prev === 'HEADPHONES') return 'TRACKING';
        if (prev === 'TRACKING') return 'PLAYBACK';
        return 'COMPLETED';
      })();

      if (nextStep === 'COMPLETED') {
        try {
          if (typeof localStorage !== 'undefined' && localStorage.setItem) {
            localStorage.setItem('ambiviz_onboarding_completed', 'true');
          }
        } catch (e) {
          console.warn('Failed to set localStorage:', e);
        }
      }
      return nextStep;
    });
  };

  const resetOnboarding = () => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
        localStorage.removeItem('ambiviz_onboarding_completed');
      }
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    setCurrentStep('HEADPHONES');
  };

  return (
    <OnboardingContext.Provider value={{ currentStep, advanceStep, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
