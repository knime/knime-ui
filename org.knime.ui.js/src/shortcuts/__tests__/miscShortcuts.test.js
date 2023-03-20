import { expect, describe, beforeEach, it, vi } from 'vitest';
import { sidePanelShortcuts, selectionShortcuts } from '../miscShortcuts';

describe('miscShortcuts', () => {
    let mockDispatch, $store, mockCommit;

    beforeEach(() => {
        mockDispatch = vi.fn();
        mockCommit = vi.fn();
        $store = {
            dispatch: mockDispatch,
            commit: mockCommit
        };
    });

    describe('sidePanelShortcuts', () => {
        it('execute toggleSidePanel', () => {
            sidePanelShortcuts.toggleSidePanel.execute({ $store });
            expect(mockCommit).toHaveBeenCalledWith('panel/toggleExpanded');
        });
    });

    describe('selectionShortcuts', () => {
        it('execute selectAllNodes', () => {
            selectionShortcuts.selectAllNodes.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('selection/selectAllNodes');
        });

        it('execute deselectAll', () => {
            selectionShortcuts.deselectAll.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('selection/deselectAllObjects');
        });
    });
});
