/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { InfoModal } from './InfoModal';
import { OnboardingContext } from './onboarding/OnboardingContext';

afterEach(cleanup);

describe('InfoModal Content and Attribution', () => {
    it('contains Freesound and Google Open Binaural Renderer attribution', () => {
        const { getByText, container } = render(
            <InfoModal isOpen={true} onClose={() => {}} />
        );
        expect(container.textContent).toContain('Freesound');
        expect(container.textContent).toContain('Google Open Binaural Renderer');
    });

    it('contains Virtual Virgin music examples attribution with correct href', () => {
        const { container } = render(
            <InfoModal isOpen={true} onClose={() => {}} />
        );
        expect(container.textContent).toContain('Virtual Virgin');
        const link = container.querySelector('a[href="https://www.virtualvirgin.net/audio-examples"]');
        expect(link).toBeTruthy();
    });

    it('contains a table with at least 9 data rows', () => {
        const { container } = render(
            <InfoModal isOpen={true} onClose={() => {}} />
        );
        const table = container.querySelector('table');
        expect(table).toBeTruthy();
        const rows = table?.querySelectorAll('tbody tr');
        expect(rows?.length).toBeGreaterThanOrEqual(9);
    });

    it('Given the InfoModal is open, When the user clicks "Restart Walkthrough", Assert that the context reset function is called and the modal close function is called', () => {
        const mockReset = vi.fn();
        const mockClose = vi.fn();
        
        const mockContextValue = {
            currentStep: 'COMPLETED' as const,
            advanceStep: vi.fn(),
            resetOnboarding: mockReset,
        };

        const { getByRole } = render(
            <OnboardingContext.Provider value={mockContextValue}>
                <InfoModal isOpen={true} onClose={mockClose} />
            </OnboardingContext.Provider>
        );

        const restartBtn = getByRole('button', { name: /Restart Walkthrough/i });
        expect(restartBtn).toBeTruthy();
        
        fireEvent.click(restartBtn);
        
        expect(mockReset).toHaveBeenCalled();
        expect(mockClose).toHaveBeenCalled();
    });
});
