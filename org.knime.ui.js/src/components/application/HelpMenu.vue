<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from "vue";
import { API } from "@api";
import { useRouter } from "vue-router";

import type { MenuItem } from "@knime/components";
import HelpIcon from "@knime/styles/img/icons/circle-help.svg";
import HubIcon from "@knime/styles/img/icons/cloud-knime.svg";
import DocsIcon from "@knime/styles/img/icons/file-text.svg";
import ForumIcon from "@knime/styles/img/icons/forum.svg";
import GraduateHatIcon from "@knime/styles/img/icons/graduate-hat.svg";
import LinkExteranlIcon from "@knime/styles/img/icons/link-external.svg";
import GettingStartedIcon from "@knime/styles/img/icons/rocket.svg";
import ShortcutsIcon from "@knime/styles/img/icons/shortcuts.svg";
import CheatSheetsIcon from "@knime/styles/img/icons/speedo.svg";
import Steps123Icon from "@knime/styles/img/icons/steps-1-3.svg";

import InfoIcon from "@/assets/info.svg";
import OptionalSubMenuActionButton from "@/components/common/OptionalSubMenuActionButton.vue";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { useSettingsStore } from "@/store/settings";

const OpenSourceCreditsModal = defineAsyncComponent(
  () => import("./OpenSourceCreditsModal.vue"),
);

const buildExternalUrl = (url: string) => {
  return `${url}?src=knimeappmodernui`;
};

const applicationStore = useApplicationStore();
const settingsStore = useSettingsStore();
const $router = useRouter();

const customHelpMenuEntries = computed(() => {
  const records = applicationStore.customHelpMenuEntries;
  return Object.keys(records).map((key, idx) => ({
    text: key,
    separator: idx === Object.keys(records).length - 1,
    icon: LinkExteranlIcon,
    href: buildExternalUrl(records[key]),
  }));
});

const creditsModalActive = ref(false);

const hasExampleWorkflows = computed(
  () => applicationStore.exampleProjects.length > 0,
);
const hasDismissedExamples = computed(
  () => !settingsStore.settings.shouldShowExampleWorkflows,
);

const addConditionalMenuEntry = (condition: boolean, item: MenuItem) => {
  return condition ? [item] : [];
};

const helpMenuItem = computed<MenuItem>(() => ({
  text: "Help",
  icon: HelpIcon,
  children: [
    {
      text: "Show keyboard shortcuts",
      description: "",
      separator: true,
      icon: ShortcutsIcon,
      metadata: {
        handler: () => applicationStore.setIsShortcutsOverviewDialogOpen(true),
      },
    },
    {
      text: "KNIME Getting Started Guide",
      icon: GettingStartedIcon,
      href: buildExternalUrl("https://www.knime.com/getting-started-guide"),
    },
    {
      text: "KNIME Self-paced Courses",
      icon: GraduateHatIcon,
      href: buildExternalUrl("https://knime.com/modern-ui-courses/"),
    },
    {
      text: "KNIME Cheat Sheets",
      icon: CheatSheetsIcon,
      href: buildExternalUrl("https://www.knime.com/cheat-sheets"),
    },
    {
      text: "KNIME Documentation",
      icon: DocsIcon,
      href: buildExternalUrl("https://docs.knime.com/"),
    },
    {
      text: "Get help from the KNIME Community",
      icon: ForumIcon,
      href: buildExternalUrl("https://forum.knime.com/"),
    },
    {
      text: "KNIME Hub",
      separator: true,
      icon: HubIcon,
      href: buildExternalUrl("https://hub.knime.com/"),
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
      text: "Additional credits",
      icon: InfoIcon,
      separator: hasDismissedExamples.value && hasExampleWorkflows.value,
      metadata: {
        handler: () => (creditsModalActive.value = true),
      },
    },
    ...addConditionalMenuEntry(
      hasDismissedExamples.value && hasExampleWorkflows.value,
      {
        text: "Restore examples on home tab",
        icon: Steps123Icon,
        metadata: {
          handler: () => {
            settingsStore.updateSetting({
              key: "shouldShowExampleWorkflows",
              value: true,
            });

            $router.push({
              name: APP_ROUTES.Home.GetStarted,
              query: { skipLastVisitedPage: "true" },
            });
          },
        },
      },
    ),
  ],
}));

const onItemClick = (_: MouseEvent, item: MenuItem) =>
  item.metadata?.handler?.();
</script>

<template>
  <div>
    <OptionalSubMenuActionButton
      class="help-menu"
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

<style lang="postcss" scoped>
.help-menu {
  /* make sure opening this menu is prioritized over app skeleton */
  --z-index-common-menu-items-expanded: v-bind(
    "$zIndices.layerPriorityElevation"
  );
}
</style>
