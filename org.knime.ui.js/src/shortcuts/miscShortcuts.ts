import type { UnionToShortcutRegistry } from './types';

type SelectionShortcuts = UnionToShortcutRegistry<'selectAll' | 'deselectAll'>;

type SidePanelShortcuts = UnionToShortcutRegistry<'toggleSidePanel'>;

declare module './index' {
    interface ShortcutsRegistry extends SelectionShortcuts, SidePanelShortcuts {}
}

export const selectionShortcuts: SelectionShortcuts = {
    selectAll: {
        hotkey: ['Ctrl', 'A'],
        execute: ({ $store }) => $store.dispatch('selection/selectAllObjects')
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
