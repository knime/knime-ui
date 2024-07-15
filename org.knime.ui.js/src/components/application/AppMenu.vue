<script setup lang="ts">
import { computed } from "vue";
import { API } from "@/api";
import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";

import MenuIcon from "@knime/styles/img/icons/menu-options.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";
import ExtensionsIcon from "@knime/styles/img/icons/extension.svg";
import SwitchIcon from "@knime/styles/img/icons/switch.svg";
import PerspectiveSwitchIcon from "@knime/styles/img/icons/perspective-switch.svg";
import LensIcon from "@knime/styles/img/icons/lens.svg";
import LensPlusIcon from "@knime/styles/img/icons/lense-plus.svg";
import LensMinusIcon from "@knime/styles/img/icons/lense-minus.svg";
import FileTextIcon from "@knime/styles/img/icons/file-text.svg";

import { type MenuItem } from "@knime/components";
import { useStore } from "@/composables/useStore";

const store = useStore();

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
          100 * store.state.settings.settings.uiScale
        ).toFixed(0)}%`,
        icon: LensIcon,
        children: [
          {
            text: "Make larger",
            icon: LensPlusIcon,
            metadata: {
              handler: () => store.dispatch("settings/increaseUiScale"),
            },
          },
          {
            text: "Make smaller",
            icon: LensMinusIcon,
            metadata: {
              handler: () => store.dispatch("settings/decreaseUiScale"),
            },
          },
          {
            text: "Reset to default",
            metadata: {
              handler: () => store.dispatch("settings/resetUiScale"),
            },
          },
        ],
      },
    ],
  };
});

const onItemClick = (_: MouseEvent, item: MenuItem) =>
  item.metadata?.handler?.();
</script>

<template>
  <OptionalSubMenuActionButton
    hide-dropdown
    :item="menuItem"
    @item-click="onItemClick"
  />
</template>
