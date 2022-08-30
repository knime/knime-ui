import { sidePanelShortcuts, selectionShortcuts } from '../miscShortcuts';

describe('miscShortcuts', () => {
    let mockDispatch, $store;

    beforeEach(() => {
        mockDispatch = jest.fn();
        $store = {
            dispatch: mockDispatch
        };
    });

    describe('sidePanelShortcuts', () => {
        test('execute toggleSidePanel', () => {
            sidePanelShortcuts.toggleSidePanel.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('panel/toggleExpanded');
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
