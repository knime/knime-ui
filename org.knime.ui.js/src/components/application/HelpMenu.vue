<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  useTemplateRef,
} from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import { type MenuItem, SubMenu, useHint } from "@knime/components";
import HubIcon from "@knime/styles/img/icons/cloud-knime.svg";
import DocsIcon from "@knime/styles/img/icons/file-text.svg";
import ForumIcon from "@knime/styles/img/icons/forum.svg";
import GraduateHatIcon from "@knime/styles/img/icons/graduate-hat.svg";
import HelpIcon from "@knime/styles/img/icons/help.svg";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";
import GettingStartedIcon from "@knime/styles/img/icons/rocket.svg";
import ShortcutsIcon from "@knime/styles/img/icons/shortcuts.svg";
import CheatSheetsIcon from "@knime/styles/img/icons/speedo.svg";
import Steps123Icon from "@knime/styles/img/icons/steps-1-3.svg";
import TeamPlan from "@knime/styles/img/icons/team-group.svg";

import InfoIcon from "@/assets/info.svg";
import { isDesktop } from "@/environment";
import { HINTS } from "@/hints/hints.config";
import { knimeExternalUrls, modernUISource } from "@/plugins/knimeExternalUrls";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { useSettingsStore } from "@/store/settings";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useWorkflowStore } from "@/store/workflow/workflow";
import type { MenuItemWithHandler } from "../common/types";

const OpenSourceCreditsModal = defineAsyncComponent(
  () => import("./OpenSourceCreditsModal.vue"),
);

const buildExternalUrl = (url: string) => {
  return `${url}${modernUISource}`;
};

const applicationStore = useApplicationStore();
const settingsStore = useSettingsStore();
const { totalNodes } = storeToRefs(useWorkflowStore());
const { getCommunityHubInfo } = storeToRefs(useSpaceProvidersStore());
const $router = useRouter();

const {
  CHEAT_SHEETS_URL,
  COMMUNITY_FORUM_URL,
  DOCUMENTATION_URL,
  GETTING_STARTED_URL,
  KNIME_HUB_HOME_URL,
  SELF_PACED_COURSES_URL,
  PRICING_URL,
} = knimeExternalUrls;

const customHelpMenuEntries = computed(() => {
  const records = applicationStore.customHelpMenuEntries;
  return Object.keys(records).map((key, idx) => ({
    text: key,
    separator: idx === Object.keys(records).length - 1,
    icon: LinkExternalIcon,
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

const menuItems = computed(() => [
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
    href: buildExternalUrl(GETTING_STARTED_URL),
  },
  {
    text: "KNIME Self-paced Courses",
    icon: GraduateHatIcon,
    href: buildExternalUrl(SELF_PACED_COURSES_URL),
  },
  {
    text: "KNIME Cheat Sheets",
    icon: CheatSheetsIcon,
    href: buildExternalUrl(CHEAT_SHEETS_URL),
  },
  {
    text: "KNIME Documentation",
    icon: DocsIcon,
    href: buildExternalUrl(DOCUMENTATION_URL),
  },
  {
    text: "Get help from the KNIME Community",
    icon: ForumIcon,
    href: buildExternalUrl(COMMUNITY_FORUM_URL),
  },
  {
    text: "KNIME Hub",
    separator: true,
    icon: HubIcon,
    href: buildExternalUrl(KNIME_HUB_HOME_URL),
  },
  ...addConditionalMenuEntry(
    getCommunityHubInfo.value.isOnlyCommunityHubMounted,
    {
      text: "Learn more about KNIME pricing",
      separator: true,
      icon: TeamPlan,
      href: `${PRICING_URL}&alt=helpmenubutton`,
    },
  ),

  // Add custom help menu entries if present
  ...customHelpMenuEntries.value,

  ...addConditionalMenuEntry(isDesktop(), {
    text: "About KNIME Analytics Platform",
    icon: InfoIcon,
    metadata: {
      handler: () => API.desktop.openAboutDialog(),
    },
  }),
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
]);

const onItemClick = (_: MouseEvent, item: MenuItem) =>
  (item as MenuItemWithHandler).metadata?.handler?.();

const { createHint } = useHint();
const helpMenuRef = useTemplateRef("helpMenuRef");

// eslint-disable-next-line no-magic-numbers
const helpIsVisibleCondition = computed(() => totalNodes.value >= 10);

onMounted(() => {
  createHint({
    hintId: HINTS.HELP,
    referenceElement: helpMenuRef,
    isVisibleCondition: helpIsVisibleCondition,
  });
});
</script>

<template>
  <div ref="helpMenuRef">
    <SubMenu
      :teleport-to-body="false"
      orientation="left"
      class="help-menu"
      aria-label="Help"
      :items="menuItems"
      @item-click="onItemClick"
    >
      <HelpIcon />
    </SubMenu>

    <OpenSourceCreditsModal
      :active="creditsModalActive"
      @update:active="creditsModalActive = false"
    />
  </div>
</template>
