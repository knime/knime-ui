import type { UnionToShortcutRegistry } from './types';

type SelectionShortcuts = UnionToShortcutRegistry<'selectAllNodes' | 'deselectAll'>;

type SidePanelShortcuts = UnionToShortcutRegistry<'toggleSidePanel'>;

declare module './index' {
    interface ShortcutsRegistry extends SelectionShortcuts, SidePanelShortcuts {}
}

export const selectionShortcuts: SelectionShortcuts = {
    selectAllNodes: {
        hotkey: ['Ctrl', 'A'],
        execute: ({ $store }) => $store.dispatch('selection/selectAllNodes')
    },
    deselectAll: {
        hotkey: ['Ctrl', 'Shift', 'A'],
        execute: ({ $store }) => $store.dispatch('selection/deselectAllObjects')
    }
};

export const sidePanelShortcuts: SidePanelShortcuts = {
    toggleSidePanel: {
        hotkey: ['Ctrl', 'P'],
        execute: ({ $store }) => $store.commit('panel/toggleExpanded')
    }
};
