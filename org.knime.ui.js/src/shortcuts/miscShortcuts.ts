import type { UnionToShortcutRegistry } from "./types";
import { TABS } from "@/store/panel";

type SelectionShortcuts = UnionToShortcutRegistry<"selectAll" | "deselectAll">;

type SidePanelShortcuts = UnionToShortcutRegistry<
  "toggleSidePanel" | "toggleKai"
>;

declare module "./index" {
  interface ShortcutsRegistry extends SelectionShortcuts, SidePanelShortcuts {}
}

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
  toggleKai: {
    hotkey: ["Ctrl", "Alt", "A"],
    execute: ({ $store }) =>
      $store.dispatch("panel/setCurrentProjectActiveTab", TABS.AI_CHAT),
  },
};
