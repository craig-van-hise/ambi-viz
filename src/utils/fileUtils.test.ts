import { describe, it, expect } from 'vitest';
import { isSupportedAudioFile, SUPPORTED_EXTENSIONS } from './fileUtils';

describe('fileUtils', () => {
    describe('SUPPORTED_EXTENSIONS', () => {
        it('should include opus', () => {
            expect(SUPPORTED_EXTENSIONS).toContain('opus');
        });
    });

    describe('isSupportedAudioFile', () => {
        it('should return true given a filename like test.opus', () => {
            const file = new File([''], 'test.opus');
            const result = isSupportedAudioFile(file);
            expect(result).toBe(true);
        });

        it('should return true given MIME type audio/opus even if extension is missing (Phase 1 Checkpoint 2)', () => {
            // Wait, the current implementation only checks the extension!
            // Let's write a failing test first as per TDD requirement in PRP.
            const file = new File([''], 'test', { type: 'audio/opus' });
            const result = isSupportedAudioFile(file);
            expect(result).toBe(true);
        });
    });
});
