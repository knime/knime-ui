import { sidePanelCommands, selectionCommands } from '~/commands/variousCommands';

describe('variousCommands', () => {
    let mockDispatch, $store;

    beforeEach(() => {
        mockDispatch = jest.fn();
        $store = {
            dispatch: mockDispatch
        };
    });

    describe('sidePanelCommands', () => {
        test('execute toggleSidePanel', () => {
            sidePanelCommands.toggleSidePanel.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('panel/toggleExpanded');
        });
    });

    describe('selectionCommands', () => {
        test('execute selectAllNodes', () => {
            selectionCommands.selectAllNodes.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('selection/selectAllNodes');
        });

        test('execute deselectAll', () => {
            selectionCommands.deselectAll.execute({ $store });
            expect(mockDispatch).toHaveBeenCalledWith('selection/deselectAllObjects');
        });
    });
});
