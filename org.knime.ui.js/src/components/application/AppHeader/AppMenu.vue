<script setup lang="ts">
import { computed } from "vue";
import { API } from "@api";

import { type MenuItem } from "@knime/components";
import ExtensionsIcon from "@knime/styles/img/icons/extension.svg";
import FileTextIcon from "@knime/styles/img/icons/file-text.svg";
import LensIcon from "@knime/styles/img/icons/lens.svg";
import MenuIcon from "@knime/styles/img/icons/menu-options.svg";
import PerspectiveSwitchIcon from "@knime/styles/img/icons/perspective-switch.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";
import SwitchIcon from "@knime/styles/img/icons/switch.svg";

import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";
import type { MenuItemWithHandler } from "@/components/common/types";
import { useShortcuts } from "@/plugins/shortcuts";
import type { ShortcutName } from "@/shortcuts";
import { useSettingsStore } from "@/store/settings";

const $shortcuts = useShortcuts();

const shortcutToMenuItem = (name: ShortcutName): MenuItem => ({
  text: $shortcuts.getText(name),
  icon: $shortcuts.get(name).icon,
  hotkeyText: $shortcuts.get(name).hotkeyText,
  metadata: {
    handler: () => $shortcuts.dispatch(name),
  },
});

const menuItem = computed<MenuItem>(() => {
  return {
    text: "Menu",
    icon: MenuIcon,
    children: [
      {
        text: "Check for updates",
        icon: ReloadIcon,
        separator: true,
        metadata: {
          handler: () => API.desktop.openUpdateDialog(),
        },
      },
      {
        text: "Show KNIME log in File Explorer",
        description: "",
        icon: FileTextIcon,
        separator: true,
        metadata: {
          handler: () => API.desktop.openKNIMEHomeDir(),
        },
      },
      {
        text: "Install extensions",
        description:
          "… to access additional functionality, including complex data type processing and advanced algorithms.",
        icon: ExtensionsIcon,
        separator: true,
        metadata: {
          handler: () => API.desktop.openInstallExtensionsDialog(),
        },
      },
      {
        text: "Switch workspace",
        description:
          "… to access KNIME workflows and data from a different folder on your computer.",
        icon: SwitchIcon,
        separator: true,
        metadata: {
          handler: () => API.desktop.switchWorkspace(),
        },
      },
      {
        text: "Switch to classic user interface",
        description:
          "… to use the classic user interface. Switch back again," +
          "with the button “Open KNIME Modern UI” in the top right corner.",
        icon: PerspectiveSwitchIcon,
        separator: true,
        metadata: {
          handler: () => API.desktop.switchToJavaUI(),
        },
      },
      {
        text: `Interface scale — ${(
          100 * useSettingsStore().settings.uiScale
        ).toFixed(0)}%`,
        icon: LensIcon,
        children: [
          shortcutToMenuItem("increaseUiScale"),
          shortcutToMenuItem("decreaseUiScale"),
          shortcutToMenuItem("resetUiScale"),
        ],
      },
    ],
  };
});

const onItemClick = (_: MouseEvent, item: MenuItem) =>
  (item as MenuItemWithHandler).metadata?.handler?.();
</script>

<template>
  <div>
    <OptionalSubMenuActionButton
      class="app-menu"
      hide-dropdown
      :item="menuItem"
      @item-click="onItemClick"
    />
  </div>
</template>
