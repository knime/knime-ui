<script setup lang="ts">
import { API } from "@/api";
import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";
import OpenSourceCreditsModal from "./OpenSourceCreditsModal.vue";

import HelpIcon from "webapps-common/ui/assets/img/icons/circle-help.svg";
import ForumIcon from "webapps-common/ui/assets/img/icons/forum.svg";
import GettingStartedIcon from "webapps-common/ui/assets/img/icons/rocket.svg";
import CheatSheetsIcon from "webapps-common/ui/assets/img/icons/speedo.svg";
import DocsIcon from "webapps-common/ui/assets/img/icons/file-text.svg";
import InfoIcon from "@/assets/info.svg";
import LinkExteranlIcon from "webapps-common/ui/assets/img/icons/link-external.svg";
import type { MenuItem } from "webapps-common/ui/components/MenuItems.vue";
import { computed, ref } from "vue";
import { useStore } from "@/composables/useStore";
import ShortcutsIcon from "webapps-common/ui/assets/img/icons/shortcuts.svg";

const buildExternalUrl = (url: string) => {
  return `${url}?src=knimeappmodernui`;
};

const store = useStore();

const customHelpMenuEntries = computed(() => {
  const records = store.state.application.customHelpMenuEntries;
  return Object.keys(records).map((key, idx) => ({
    text: key,
    separator: idx === Object.keys(records).length - 1,
    icon: LinkExteranlIcon,
    href: buildExternalUrl(records[key]),
  }));
});

const creditsModalActive = ref(false);

const helpMenuItem: MenuItem = {
  text: "Help",
  icon: HelpIcon,
  children: [
    {
      text: "Show keyboard shortcuts",
      description: "",
      separator: true,
      icon: ShortcutsIcon,
      metadata: {
        handler: () =>
          store.commit("application/setIsShortcutsOverviewDialogOpen", true),
      },
    },
    {
      text: "KNIME Getting started guide",
      icon: GettingStartedIcon,
      href: buildExternalUrl("https://www.knime.com/getting-started-guide"),
    },
    {
      text: "KNIME Cheat sheets",
      icon: CheatSheetsIcon,
      href: buildExternalUrl("https://www.knime.com/cheat-sheets"),
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

    // Add custom help menu entries if present
    ...customHelpMenuEntries.value,

    {
      text: "About KNIME Analytics Platform",
      icon: InfoIcon,
      metadata: {
        handler: () => API.desktop.openAboutDialog(),
      },
    },
    {
      text: "Additional Credits",
      icon: InfoIcon,
      metadata: {
        handler: () => (creditsModalActive.value = true),
      },
    },
  ],
};

const onItemClick = (_: any, item: MenuItem) => item.metadata?.handler?.();
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
