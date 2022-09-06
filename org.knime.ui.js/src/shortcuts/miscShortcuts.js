export const selectionShortcuts = {
    selectAllNodes: {
        hotkey: ['Ctrl', 'A'],
        execute: ({ $store }) => $store.dispatch('selection/selectAllNodes')
    },
    deselectAll: {
        hotkey: ['Ctrl', 'Shift', 'A'],
        execute: ({ $store }) => $store.dispatch('selection/deselectAllObjects')
    }
};

export const sidePanelShortcuts = {
    toggleSidePanel: {
        hotkey: ['Ctrl', 'P'],
        execute: ({ $store }) => $store.dispatch('panel/toggleExpanded')
    }
};
