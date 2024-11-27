import LensMinusIcon from "@knime/styles/img/icons/lense-minus.svg";
import LensPlusIcon from "@knime/styles/img/icons/lense-plus.svg";

import type { UnionToShortcutRegistry } from "./types";

type SelectionShortcuts = UnionToShortcutRegistry<"selectAll" | "deselectAll">;

type SidePanelShortcuts = UnionToShortcutRegistry<"toggleSidePanel">;

type UiScaleShortcuts = UnionToShortcutRegistry<
  "increaseUiScale" | "decreaseUiScale" | "resetUiScale"
>;

declare module "./index" {
  interface ShortcutsRegistry
    extends SelectionShortcuts,
      SidePanelShortcuts,
      UiScaleShortcuts {}
}

export const selectionShortcuts: SelectionShortcuts = {
  selectAll: {
    text: "Select all objects",
    hotkey: ["CtrlOrCmd", "A"],
    group: "general",
    execute: ({ $store }) => $store.dispatch("selection/selectAllObjects"),
  },
  deselectAll: {
    text: "Deselect all objects",
    hotkey: ["CtrlOrCmd", "Shift", "A"],
    group: "general",
    execute: ({ $store }) => $store.dispatch("selection/deselectAllObjects"),
  },
};

export const sidePanelShortcuts: SidePanelShortcuts = {
  toggleSidePanel: {
    text: "Hide or show side panel",
    group: "panelNavigation",
    hotkey: ["CtrlOrCmd", "P"],
    execute: ({ $store }) => $store.commit("panel/toggleExpanded"),
  },
};

export const uiScaleShortcuts: UiScaleShortcuts = {
  increaseUiScale: {
    text: "Make larger",
    icon: LensPlusIcon,
    execute: ({ $store }) => $store.dispatch("settings/increaseUiScale"),
  },
  decreaseUiScale: {
    text: "Make smaller",
    icon: LensMinusIcon,
    execute: ({ $store }) => $store.dispatch("settings/decreaseUiScale"),
  },
  resetUiScale: {
    text: "Reset interface scale",
    hotkey: ["CtrlOrCmd", "Alt", "0"],
    additionalHotkeys: [{ key: ["CtrlOrCmd", "Alt", "0-0"], visible: false }], // range matches Digit0 Key instead of event.code
    execute: ({ $store }) => $store.dispatch("settings/resetUiScale"),
  },
};
