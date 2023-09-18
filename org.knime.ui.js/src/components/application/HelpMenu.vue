<script setup lang="ts">
import { API } from "@/api";
import OptionalSubMenuActionButton from "../common/OptionalSubMenuActionButton.vue";
import OpenSourceCreditsModal from "./OpenSourceCreditsModal.vue";

import HelpIcon from "webapps-common/ui/assets/img/icons/circle-help.svg";
import ForumIcon from "webapps-common/ui/assets/img/icons/forum.svg";
import GettingStartedIcon from "webapps-common/ui/assets/img/icons/rocket.svg";
import CheatSheetsIcon from "webapps-common/ui/assets/img/icons/speedo.svg";
import DocsIcon from "webapps-common/ui/assets/img/icons/file-text.svg";
import InfoIcon from "@/assets/info.svg";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import { ref } from "vue";

const buildExternalUrl = (url: string) => {
  return `${url}?src=knimeappmodernui`;
};

const creditsModalActive = ref(false);

const helpMenuItem: MenuItem = {
  text: "Help",
  icon: HelpIcon,
  children: [
    {
      text: "KNIME Getting started guide",
      icon: GettingStartedIcon,
      href: buildExternalUrl("https://www.knime.com/getting-started-guide-5-1"),
    },
    {
      text: "KNIME Cheat sheets",
      icon: CheatSheetsIcon,
      href: buildExternalUrl("https://www.knime.com/cheat-sheets-5-1"),
    },
    {
      text: "KNIME Documentation",
      icon: DocsIcon,
      href: buildExternalUrl("https://docs.knime.com/"),
    },
    {
      text: "Get Help From the KNIME Community",
      separator: true,
      icon: ForumIcon,
      href: buildExternalUrl("https://forum.knime.com/"),
    },
    {
      text: "About KNIME Analytics Platform",
      icon: InfoIcon,
      metadata: {
        action: () => API.desktop.openAboutDialog(),
      },
    },
    {
      text: "Additional Credits",
      icon: InfoIcon,
      metadata: {
        action: () => (creditsModalActive.value = true),
      },
    },
  ],
};

const onItemClick = (_, item) => item.metadata?.action?.();
</script>

<template>
  <div>
    <OptionalSubMenuActionButton
      hide-dropdown
      :item="helpMenuItem"
      @item-click="onItemClick"
    />
    <OpenSourceCreditsModal
      :active="creditsModalActive"
      @update:active="creditsModalActive = false"
    />
  </div>
</template>
