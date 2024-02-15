import type { UnionToShortcutRegistry } from "./types";

export type SelectionShortcuts = UnionToShortcutRegistry<
  "selectAll" | "deselectAll"
>;

export type SidePanelShortcuts = UnionToShortcutRegistry<"toggleSidePanel">;

export const selectionShortcuts: SelectionShortcuts = {
  selectAll: {
    hotkey: ["Ctrl", "A"],
    execute: ({ $store }) => $store.dispatch("selection/selectAllObjects"),
  },
  deselectAll: {
    hotkey: ["Ctrl", "Shift", "A"],
    execute: ({ $store }) => $store.dispatch("selection/deselectAllObjects"),
  },
};

export const sidePanelShortcuts: SidePanelShortcuts = {
  toggleSidePanel: {
    hotkey: ["Ctrl", "P"],
    execute: ({ $store }) => $store.commit("panel/toggleExpanded"),
  },
};
