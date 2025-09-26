import LensMinusIcon from "@knime/styles/img/icons/lense-minus.svg";
import LensPlusIcon from "@knime/styles/img/icons/lense-plus.svg";

import { isDesktop } from "@/environment";
import { APP_ROUTES } from "@/router/appRoutes";
import { usePanelStore } from "@/store/panel";
import { useSelectionStore } from "@/store/selection";
import { useSettingsStore } from "@/store/settings";

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
    execute: () => useSelectionStore().selectAllObjects(),
  },
  deselectAll: {
    text: "Deselect all objects",
    hotkey: ["CtrlOrCmd", "Shift", "A"],
    group: "general",
    execute: () => useSelectionStore().deselectAllObjects(),
  },
};

export const sidePanelShortcuts: SidePanelShortcuts = {
  toggleSidePanel: {
    text: "Hide or show left side panel",
    group: "panelNavigation",
    hotkey: ["CtrlOrCmd", "P"],
    execute: () => {
      usePanelStore().isCommandPanelVisible =
        !usePanelStore().isCommandPanelVisible;
    },
    condition: ({ $router }) => {
      const isWorkflowPage =
        $router.currentRoute.value.name === APP_ROUTES.WorkflowPage;
      return isWorkflowPage && isDesktop();
    },
  },
};

export const uiScaleShortcuts: UiScaleShortcuts = {
  increaseUiScale: {
    text: "Make larger",
    icon: LensPlusIcon,
    execute: () => useSettingsStore().increaseUiScale(),
  },
  decreaseUiScale: {
    text: "Make smaller",
    icon: LensMinusIcon,
    execute: () => useSettingsStore().decreaseUiScale(),
  },
  resetUiScale: {
    text: "Reset interface scale",
    hotkey: ["CtrlOrCmd", "Alt", "0"],
    additionalHotkeys: [{ key: ["CtrlOrCmd", "Alt", "0-0"], visible: false }], // range matches Digit0 Key instead of event.code
    execute: () => useSettingsStore().resetUiScale(),
  },
};
