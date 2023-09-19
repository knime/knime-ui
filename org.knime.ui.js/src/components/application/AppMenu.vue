<script setup lang="ts">
import { API } from "@/api";
import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";

import MenuIcon from "webapps-common/ui/assets/img/icons/menu-options.svg";
import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import ExtensionsIcon from "webapps-common/ui/assets/img/icons/extension.svg";
import SwitchIcon from "webapps-common/ui/assets/img/icons/switch.svg";
import PerspectiveSwitchIcon from "webapps-common/ui/assets/img/icons/perspective-switch.svg";

import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";

const menuItem: MenuItem = {
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
      metadata: {
        handler: () => API.desktop.switchToJavaUI(),
      },
    },
  ],
};

const onItemClick = (_, item) => item.metadata?.handler?.();
</script>

<template>
  <OptionalSubMenuActionButton
    hide-dropdown
    :item="menuItem"
    @item-click="onItemClick"
  />
</template>
