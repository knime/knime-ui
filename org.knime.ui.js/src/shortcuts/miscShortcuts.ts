import type { UnionToShortcutRegistry } from "./types";

type SelectionShortcuts = UnionToShortcutRegistry<"selectAll" | "deselectAll">;

type SidePanelShortcuts = UnionToShortcutRegistry<"toggleSidePanel">;

declare module "./index" {
  interface ShortcutsRegistry extends SelectionShortcuts, SidePanelShortcuts {}
}

export const selectionShortcuts: SelectionShortcuts = {
  selectAll: {
    text: "Select all objects",
    hotkey: ["Ctrl", "A"],
    group: "general",
    execute: ({ $store }) => $store.dispatch("selection/selectAllObjects"),
  },
  deselectAll: {
    text: "Deselect all objects",
    hotkey: ["Ctrl", "Shift", "A"],
    group: "general",
    execute: ({ $store }) => $store.dispatch("selection/deselectAllObjects"),
  },
};

export const sidePanelShortcuts: SidePanelShortcuts = {
  toggleSidePanel: {
    text: "Hide or show side panel",
    group: "panelNavigation",
    hotkey: ["Ctrl", "P"],
    execute: ({ $store }) => $store.commit("panel/toggleExpanded"),
  },
};
