export const selectionCommands = {
    selectAllNodes: {
        hotkey: ['Ctrl', 'A'],
        execute: ({ $store }) => $store.dispatch('selection/selectAllNodes')
    },
    deselectAll: {
        hotkey: ['Ctrl', 'Shift', 'A'],
        execute: ({ $store }) => $store.dispatch('selection/deselectAllObjects')
    }
};

export const sidePanelCommands = {
    toggleSidePanel: {
        hotkey: ['Ctrl', 'P'],
        execute: ({ $store }) => $store.dispatch('panel/toggleExpanded')
    }
};
