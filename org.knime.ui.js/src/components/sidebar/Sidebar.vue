<script setup lang="ts">
import { defineAsyncComponent, computed, watch } from "vue";
import type { FunctionalComponent, SVGAttributes } from "vue";

import CubeIcon from "webapps-common/ui/assets/img/icons/cube.svg";
import PlusIcon from "webapps-common/ui/assets/img/icons/node-stack.svg";
import AiIcon from "webapps-common/ui/assets/img/icons/ai-general.svg";

import WorkflowMonitorIcon from "@/assets/workflow-monitor-icon.svg";
import MetainfoIcon from "@/assets/metainfo.svg";
import { compatibility } from "@/environment";
import { TABS, type TabValues } from "@/store/panel";
import { useStore } from "@/composables/useStore";
import { useFeatures } from "@/plugins/feature-flags";

import LeftCollapsiblePanel from "./LeftCollapsiblePanel.vue";
import SidebarExtensionPanel from "./SidebarExtensionPanel.vue";
import SidebarContentLoading from "./SidebarContentLoading.vue";

type SidebarSection = {
  name: TabValues;
  title: string;
  icon: FunctionalComponent<SVGAttributes>;
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
  loader: () => import("@/components/sidebar/ContextAwareDescription.vue"),
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
  loader: () => import("@/components/kaiSidebar/KaiSidebar.vue"),
  loadingComponent: SidebarContentLoading,
});

const WorkflowMonitor = defineAsyncComponent({
  loader: () => import("@/components/workflowMonitor/WorkflowMonitor.vue"),
  loadingComponent: SidebarContentLoading,
});

const $features = useFeatures();
const store = useStore();
const expanded = computed(() => store.state.panel.expanded);
const isExtensionPanelOpen = computed(
  () => store.state.panel.isExtensionPanelOpen,
);

const permissions = computed(() => store.state.application.permissions);

const isWorkflowEmpty = computed(
  () => store.getters["workflow/isWorkflowEmpty"],
);

watch(
  isWorkflowEmpty,
  () => {
    if (isWorkflowEmpty.value) {
      store.dispatch("panel/setCurrentProjectActiveTab", TABS.NODE_REPOSITORY);
    }
  },
  { immediate: true },
);

const isTabActive = computed<(tabName: TabValues) => boolean>(
  () => store.getters["panel/isTabActive"],
);

const activateSection = (tabName: TabValues) => {
  const isAlreadyActive = isTabActive.value(tabName);
  if (isAlreadyActive && expanded.value) {
    store.commit("panel/closePanel");
  } else {
    store.dispatch("panel/setCurrentProjectActiveTab", tabName);
  }

  store.dispatch("panel/closeExtensionPanel");
};

const sidebarSections = computed<Array<SidebarSection>>(() => {
  return [
    {
      name: TABS.CONTEXT_AWARE_DESCRIPTION,
      title: "Description",
      icon: MetainfoIcon,
      isActive: isTabActive.value(TABS.CONTEXT_AWARE_DESCRIPTION),
      isExpanded: expanded.value,
      onClick: () => activateSection(TABS.CONTEXT_AWARE_DESCRIPTION),
    },

    ...registerSidebarSection(permissions.value.canAccessNodeRepository, {
      name: TABS.NODE_REPOSITORY,
      title: "Nodes",
      icon: PlusIcon,
      isActive: isTabActive.value(TABS.NODE_REPOSITORY),
      isExpanded: expanded.value,
      onClick: () => activateSection(TABS.NODE_REPOSITORY),
    }),

    ...registerSidebarSection(
      permissions.value.canAccessSpaceExplorer &&
        compatibility.isSpaceExplorerSupported(),
      {
        name: TABS.SPACE_EXPLORER,
        title: "Space explorer",
        icon: CubeIcon,
        isActive: isTabActive.value(TABS.SPACE_EXPLORER),
        isExpanded: expanded.value,
        onClick: () => activateSection(TABS.SPACE_EXPLORER),
      },
    ),

    ...registerSidebarSection(
      $features.isKaiPermitted() && permissions.value.canAccessKAIPanel,
      {
        name: TABS.KAI,
        title: "K-AI AI assistant",
        icon: AiIcon,
        isActive: isTabActive.value(TABS.KAI),
        isExpanded: expanded.value,
        onClick: () => activateSection(TABS.KAI),
      },
    ),

    {
      name: TABS.WORKFLOW_MONITOR,
      title: "Workflow monitor",
      icon: WorkflowMonitorIcon,
      isActive: isTabActive.value(TABS.WORKFLOW_MONITOR),
      isExpanded: expanded.value,
      onClick: () => activateSection(TABS.WORKFLOW_MONITOR),
    },
  ];
});

const hasSection = (name: TabValues) => {
  return sidebarSections.value.find((section) => section.name === name);
};
</script>

<template>
  <div id="sidebar" class="sidebar-wrapper">
    <nav>
      <div>
        <label
          v-for="section in sidebarSections"
          :key="section.title"
          :title="section.title"
          :class="{ active: section.isActive, expanded: section.isExpanded }"
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
        </label>
      </div>
    </nav>

    <LeftCollapsiblePanel
      id="left-panel"
      width="360px"
      title="Open sidebar"
      :expanded="expanded"
      :disabled="isExtensionPanelOpen"
      @toggle-expand="store.commit('panel/toggleExpanded')"
    >
      <span>
        <ContextAwareDescription
          v-if="hasSection(TABS.CONTEXT_AWARE_DESCRIPTION)"
          v-show="isTabActive(TABS.CONTEXT_AWARE_DESCRIPTION)"
        />

        <NodeRepository
          v-if="
            hasSection(TABS.NODE_REPOSITORY) &&
            isTabActive(TABS.NODE_REPOSITORY)
          "
          v-show="isTabActive(TABS.NODE_REPOSITORY)"
        />

        <SidebarSpaceExplorer
          v-if="hasSection(TABS.SPACE_EXPLORER)"
          v-show="isTabActive(TABS.SPACE_EXPLORER)"
        />

        <KaiSidebar
          v-if="hasSection(TABS.KAI)"
          v-show="isTabActive(TABS.KAI)"
        />

        <WorkflowMonitor
          v-if="hasSection(TABS.WORKFLOW_MONITOR)"
          v-show="isTabActive(TABS.WORKFLOW_MONITOR)"
        />
      </span>
    </LeftCollapsiblePanel>

    <SidebarExtensionPanel />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.sidebar-wrapper {
  display: flex;
  height: 100%;
  overflow: auto;
}

nav {
  width: var(--app-side-bar-buttons-width);
  background-color: var(--knime-black);

  & > div {
    &:focus-within:has(:focus-visible) {
      @mixin focus-style;
    }

    & label {
      height: 50px;
      width: 40px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background-color: var(--knime-silver-sand);
      border-bottom: 1px var(--knime-black) solid;
      transition: background-color 150ms ease-out;

      & svg {
        @mixin svg-icon-size 25;
      }

      &.active {
        background-color: var(--sidebar-background-color);

        &.expanded {
          background-color: var(--sidebar-background-color);
        }
      }

      &:hover {
        background-color: var(--knime-gray-ultra-light);
        cursor: pointer;

        & svg {
          stroke: var(--knime-masala);
        }
      }
    }

    & input[type="radio"] {
      /* https://accessibility.18f.gov/hidden-content/ */
      border: 0;
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      position: absolute;
      width: 1px;
      top: 0; /* top/left prevent right margin mobile safari */
      left: 0;
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
