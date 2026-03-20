<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  useTemplateRef,
  watch,
} from "vue";
import type { Component } from "vue";
import { onKeyDown } from "@vueuse/core";

import { useHint } from "@knime/components";
import AiIcon from "@knime/styles/img/icons/ai-general.svg";
import CubeIcon from "@knime/styles/img/icons/cube.svg";
import PlusIcon from "@knime/styles/img/icons/node-stack.svg";

import MetainfoIcon from "@/assets/metainfo.svg";
import WorkflowMonitorIcon from "@/assets/workflow-monitor-icon.svg";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { HINTS } from "@/hints/hints.config";
import { useAnalytics } from "@/services/analytics";
import { TABS, type TabValues } from "@/store/panel";
import { usePanelStore } from "@/store/panel";
import { useUIControlsStore } from "@/store/uiControls/uiControls";

import LeftCollapsiblePanel from "./LeftCollapsiblePanel.vue";
import SidebarContentLoading from "./SidebarContentLoading.vue";
import SidebarExtensionPanel from "./SidebarExtensionPanel.vue";

type SidebarSection = {
  name: TabValues;
  title: string;
  icon: Component;
  classes?: string[];
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
};

const registerSidebarSection = (
  condition: boolean,
  sectionData: SidebarSection,
) => {
  return condition ? [sectionData] : [];
};

const ContextAwareDescription = defineAsyncComponent({
  loader: () =>
    import("@/components/nodeDescription/ContextAwareDescription.vue"),
  loadingComponent: SidebarContentLoading,
});

const NodeRepository = defineAsyncComponent({
  loader: () => import("@/components/nodeRepository/NodeRepository.vue"),
  loadingComponent: SidebarContentLoading,
});

const SidebarSpaceExplorer = defineAsyncComponent({
  loader: () => import("@/components/sidebar/SidebarSpaceExplorer.vue"),
  loadingComponent: SidebarContentLoading,
});

const KaiSidebar = defineAsyncComponent({
  loader: () => import("@/components/kai/KaiSidebar.vue"),
  loadingComponent: SidebarContentLoading,
});

const WorkflowMonitor = defineAsyncComponent({
  loader: () => import("@/components/workflowMonitor/WorkflowMonitor.vue"),
  loadingComponent: SidebarContentLoading,
});

const panelStore = usePanelStore();
const uiControls = useUIControlsStore();

const { createHint } = useHint();

const hintIds = HINTS;

const hintIsVisibleCondition = computed(() => !panelStore.isTabActive("kai"));

onMounted(() => {
  createHint({
    hintId: hintIds.K_AI,
    isVisibleCondition: hintIsVisibleCondition,
  });
});

const activateSection = (tabName: TabValues) => {
  const isAlreadyActive = panelStore.isTabActive(tabName);
  if (isAlreadyActive && panelStore.isLeftPanelExpanded) {
    panelStore.closeLeftPanel();
  } else {
    panelStore.setCurrentProjectActiveTab(tabName);
  }

  panelStore.closeExtensionPanel();
};

const { isKaiEnabled } = useIsKaiEnabled();
watch(isKaiEnabled, (enabled) => {
  if (!enabled && panelStore.isTabActive(TABS.KAI)) {
    // We switch over to the "Info" tab if K-AI gets disabled while the "K-AI" tab is active
    activateSection(TABS.CONTEXT_AWARE_DESCRIPTION);
  }
});

const sidebarSections = computed<Array<SidebarSection>>(() => {
  return [
    {
      name: TABS.CONTEXT_AWARE_DESCRIPTION,
      title: "Info",
      icon: MetainfoIcon,
      isActive: panelStore.isTabActive(TABS.CONTEXT_AWARE_DESCRIPTION),
      isExpanded: panelStore.isLeftPanelExpanded,
      onClick: () => {
        activateSection(TABS.CONTEXT_AWARE_DESCRIPTION);

        if (!panelStore.isTabActive(TABS.CONTEXT_AWARE_DESCRIPTION)) {
          useAnalytics().track("sidepanel_opened::sidepanel_click_info");
        }
      },
    },

    ...registerSidebarSection(uiControls.canAccessNodeRepository, {
      name: TABS.NODE_REPOSITORY,
      title: "Nodes",
      icon: PlusIcon,
      isActive: panelStore.isTabActive(TABS.NODE_REPOSITORY),
      isExpanded: panelStore.isLeftPanelExpanded,
      onClick: () => {
        activateSection(TABS.NODE_REPOSITORY);

        if (!panelStore.isTabActive(TABS.NODE_REPOSITORY)) {
          useAnalytics().track("sidepanel_opened::sidepanel_click_noderepo");
        }
      },
    }),

    ...registerSidebarSection(uiControls.canAccessSpaceExplorer, {
      name: TABS.SPACE_EXPLORER,
      title: "Explorer",
      icon: CubeIcon,
      isActive: panelStore.isTabActive(TABS.SPACE_EXPLORER),
      isExpanded: panelStore.isLeftPanelExpanded,
      onClick: () => {
        activateSection(TABS.SPACE_EXPLORER);

        if (!panelStore.isTabActive(TABS.SPACE_EXPLORER)) {
          useAnalytics().track("sidepanel_opened::sidepanel_click_explorer");
        }
      },
    }),

    ...registerSidebarSection(
      isKaiEnabled.value && uiControls.canAccessKAIPanel,
      {
        name: TABS.KAI,
        title: "K-AI",
        icon: AiIcon,
        classes: ["k-ai-tab"],
        isActive: panelStore.isTabActive(TABS.KAI),
        isExpanded: panelStore.isLeftPanelExpanded,
        onClick: () => {
          activateSection(TABS.KAI);

          if (!panelStore.isTabActive(TABS.KAI)) {
            useAnalytics().track("sidepanel_opened::sidepanel_click_kai");
          }
        },
      },
    ),

    {
      name: TABS.WORKFLOW_MONITOR,
      title: "Monitor",
      icon: WorkflowMonitorIcon,
      isActive: panelStore.isTabActive(TABS.WORKFLOW_MONITOR),
      isExpanded: panelStore.isLeftPanelExpanded,
      onClick: () => {
        activateSection(TABS.WORKFLOW_MONITOR);

        if (!panelStore.isTabActive(TABS.WORKFLOW_MONITOR)) {
          useAnalytics().track("sidepanel_opened::sidepanel_click_monitor");
        }
      },
    },
  ];
});

const sidebarRoot = useTemplateRef("sidebarRoot");
onKeyDown(
  "Escape",
  () => {
    if (panelStore.isExtensionPanelOpen) {
      panelStore.closeExtensionPanel();
    }
  },
  { target: sidebarRoot },
);

const hasSection = (name: TabValues) => {
  return sidebarSections.value.find((section) => section.name === name);
};
</script>

<template>
  <div id="sidebar" ref="sidebarRoot" class="sidebar-wrapper" tabindex="-1">
    <nav>
      <div>
        <label
          v-for="section in sidebarSections"
          :key="section.title"
          :title="section.title"
          :data-test-id="section.title"
          :class="[
            ...(section.classes ?? []),
            { active: section.isActive, expanded: section.isExpanded },
          ]"
        >
          <input
            name="sidebar-tabs"
            :value="section.name"
            type="radio"
            :checked="section.isActive"
            @click="section.onClick"
          />
          <span>
            <Component :is="section.icon" />
          </span>
          <span class="name">
            {{ section.title }}
          </span>
        </label>
      </div>
    </nav>

    <LeftCollapsiblePanel
      id="left-panel"
      width="360px"
      title="Open sidebar"
      :expanded="panelStore.isLeftPanelExpanded"
      :disabled="panelStore.isExtensionPanelOpen"
      @toggle-expand="panelStore.toggleLeftPanel()"
    >
      <span>
        <ContextAwareDescription
          v-if="
            hasSection(TABS.CONTEXT_AWARE_DESCRIPTION) &&
            panelStore.isTabActive(TABS.CONTEXT_AWARE_DESCRIPTION)
          "
        />
        <NodeRepository
          v-if="
            hasSection(TABS.NODE_REPOSITORY) &&
            panelStore.isTabActive(TABS.NODE_REPOSITORY)
          "
        />
        <SidebarSpaceExplorer
          v-if="
            hasSection(TABS.SPACE_EXPLORER) &&
            panelStore.isTabActive(TABS.SPACE_EXPLORER)
          "
        />
        <KaiSidebar
          v-if="hasSection(TABS.KAI) && panelStore.isTabActive(TABS.KAI)"
        />
        <WorkflowMonitor
          v-if="
            hasSection(TABS.WORKFLOW_MONITOR) &&
            panelStore.isTabActive(TABS.WORKFLOW_MONITOR)
          "
        />
      </span>
    </LeftCollapsiblePanel>

    <SidebarExtensionPanel />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

#sidebar:focus {
  outline: none;
}

.sidebar-wrapper {
  display: flex;
  height: 100%;
  overflow: auto;
}

nav {
  --bg-color: var(--knime-masala);
  --bg-tabs-color: var(--knime-silver-sand);
  --bg-tabs-color-active: var(--sidebar-background-color);
  --bg-tabs-color-hover: var(--knime-white);
  --fg-color: var(--knime-black);

  width: var(--app-side-bar-buttons-width);
  background-color: var(--bg-color);

  & > div {
    &:focus-within:has(:focus-visible) {
      @mixin focus-outline;
    }

    & label {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 52px;
      background-color: var(--bg-tabs-color);
      border-bottom: 1px solid var(--bg-color);
      transition: background-color 150ms ease-out;

      & svg {
        @mixin svg-icon-size 16;

        stroke: var(--fg-color);
      }

      & .name {
        font-size: 9px;
        font-weight: 500;
        color: var(--fg-color);
      }

      &.active {
        position: relative;
        background-color: var(--bg-tabs-color-active);

        & .name {
          color: var(--fg-color);
        }

        & svg {
          stroke: var(--fg-color);
        }
      }

      &:hover {
        cursor: pointer;
        background-color: var(--bg-tabs-color-hover);

        & .name {
          color: var(--fg-color);
        }

        & svg {
          stroke: var(--fg-color);
        }
      }
    }

    & input[type="radio"] {
      position: absolute;
      top: 0; /* top/left prevent right margin mobile safari */
      left: 0;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;

      /* https://accessibility.18f.gov/hidden-content/ */
      border: 0;
      clip: rect(0 0 0 0);
    }
  }
}

#left-panel {
  flex: 0 0 auto;
  border-right: 1px solid var(--knime-silver-sand);

  & :deep(.container) {
    /* prevent scrollbar jump when switching between tabs in the LeftCollapsiblePanel */
    overflow-y: hidden;
  }
}
</style>
