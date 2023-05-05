import { describe, it, expect } from 'vitest';
import { offsetStrategy } from '@/util/pasteToWorkflow';

describe('pasteToWorkflow', () => {
    describe('offSet strategy', () => {
        const mockClipboardContent = { objectBounds: {
            left: 0,
            top: 0,
            width: 10,
            height: 10
        } };

        const mockVisibleFrame = {
            left: 0,
            top: 0,
            width: 1000,
            height: 1000
        };

        it('returns a position with offset', () => {
            const position = offsetStrategy({ clipboardContent: mockClipboardContent, visibleFrame: mockVisibleFrame });
            expect(position.x).toBeGreaterThan(0);
            expect(position.y).toBeGreaterThan(0);
        });

        it('returns null when paste is outside of frame', () => {
            const position = offsetStrategy({
                clipboardContent: mockClipboardContent,
                visibleFrame: { ...mockVisibleFrame, width: 5, height: 5 }
            });
            expect(position).toBeNull();
        });
    });
});
