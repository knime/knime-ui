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
        test('execute toggleSidePanel', () => {
            sidePanelShortcuts.toggleSidePanel.execute({ $store });
            expect(mockCommit).toHaveBeenCalledWith('panel/toggleExpanded');
        });
    });

    describe('selectionShortcuts', () => {
        test('execute selectAllNodes', () => {
            selectionShortcuts.selectAllNodes.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('selection/selectAllNodes');
        });

        test('execute deselectAll', () => {
            selectionShortcuts.deselectAll.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('selection/deselectAllObjects');
        });
    });
});
