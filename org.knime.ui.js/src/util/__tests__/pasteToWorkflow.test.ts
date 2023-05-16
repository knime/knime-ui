import { describe, it, expect, vi } from 'vitest';
import { offsetStrategy, centerStrategy, pastePartsAt } from '@/util/pasteToWorkflow';

describe('pasteToWorkflow', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => 0);
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

    describe('center strategy', () => {
        it('returns a position with offset', () => {
            const position = centerStrategy({ clipboardContent: mockClipboardContent, visibleFrame: mockVisibleFrame });
            expect(randomSpy).toBeCalledTimes(2);
            expect(position.x).toBe(470);
            expect(position.y).toBe(345);
        });
    });

    describe('offSet strategy', () => {
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

    describe('pastePartsAt', () => {
        it('uses center strategy when workflow is empty', () => {
            const dispatch = vi.fn();
            const paste = pastePartsAt({ visibleFrame: mockVisibleFrame,
                clipboardContent: mockClipboardContent,
                isWorkflowEmpty: true,
                dispatch });
            expect(paste.position.x).toBe(470);
            expect(paste.position.y).toBe(345);
        });

        it('uses offset strategy first', () => {
            const dispatch = vi.fn();
            const paste = pastePartsAt({ visibleFrame: mockVisibleFrame,
                clipboardContent: mockClipboardContent,
                isWorkflowEmpty: false,
                dispatch });
            expect(paste.position.x).toBe(95);
            expect(paste.position.y).toBe(95);
        });

        it('uses center strategy when paste is not visible', () => {
            const dispatch = vi.fn();
            const paste = pastePartsAt({ visibleFrame: mockVisibleFrame,
                clipboardContent: { objectBounds: { ...mockClipboardContent.objectBounds, left: 3000, top: 3000 } },
                isWorkflowEmpty: false,
                dispatch });
            expect(paste.position.x).toBe(470);
            expect(paste.position.y).toBe(345);
        });
    });
});
