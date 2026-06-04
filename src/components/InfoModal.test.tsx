/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { InfoModal } from './InfoModal';

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
});
