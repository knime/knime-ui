<script lang="ts">
import { defineAsyncComponent, defineComponent } from "vue";
import type { FunctionalComponent, SVGAttributes } from "vue";
import { mapState, mapActions, mapMutations, mapGetters } from "vuex";

import NodeCogIcon from "webapps-common/ui/assets/img/icons/node-cog.svg";
import CubeIcon from "webapps-common/ui/assets/img/icons/cube.svg";
import PlusIcon from "webapps-common/ui/assets/img/icons/node-stack.svg";
import AiIcon from "webapps-common/ui/assets/img/icons/ai-general.svg";

import { compatibility } from "@/environment";
import MetainfoIcon from "@/assets/metainfo.svg";
import { TABS } from "@/store/panel";

import LeftCollapsiblePanel from "./LeftCollapsiblePanel.vue";
import SidebarExtensionPanel from "./SidebarExtensionPanel.vue";
import SidebarContentLoading from "./SidebarContentLoading.vue";

type SidebarSection = {
  name: string;
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

export default defineComponent({
  components: {
    LeftCollapsiblePanel,
    ContextAwareDescription: defineAsyncComponent({
      loader: () => import("@/components/sidebar/ContextAwareDescription.vue"),
      loadingComponent: SidebarContentLoading,
    }),
    NodeRepository: defineAsyncComponent({
      loader: () => import("@/components/nodeRepository/NodeRepository.vue"),
      loadingComponent: SidebarContentLoading,
    }),
    NodeDialogWrapper: defineAsyncComponent({
      loader: () => import("@/components/embeddedViews/NodeDialogWrapper.vue"),
      loadingComponent: SidebarContentLoading,
    }),
    SidebarSpaceExplorer: defineAsyncComponent({
      loader: () => import("@/components/sidebar/SidebarSpaceExplorer.vue"),
      loadingComponent: SidebarContentLoading,
    }),
    KaiSidebar: defineAsyncComponent({
      loader: () => import("@/components/kaiSidebar/KaiSidebar.vue"),
      loadingComponent: SidebarContentLoading,
    }),
    SidebarExtensionPanel,
  },
  data() {
    return {
      TABS: Object.freeze(TABS),
    };
  },
  computed: {
    ...mapState("panel", ["activeTab", "expanded", "isExtensionPanelOpen"]),
    ...mapState("application", ["activeProjectId"]),
    ...mapGetters("workflow", ["isWorkflowEmpty"]),

    sidebarSections(): Array<SidebarSection> {
      return [
        {
          name: TABS.CONTEXT_AWARE_DESCRIPTION,
          title: "Description",
          icon: MetainfoIcon,
          isActive: this.isTabActive(TABS.CONTEXT_AWARE_DESCRIPTION),
          isExpanded: this.expanded,
          onClick: () => this.clickItem(TABS.CONTEXT_AWARE_DESCRIPTION),
        },
        {
          name: TABS.NODE_REPOSITORY,
          title: "Nodes",
          icon: PlusIcon,
          isActive: this.isTabActive(TABS.NODE_REPOSITORY),
          isExpanded: this.expanded,
          onClick: () => this.clickItem(TABS.NODE_REPOSITORY),
        },

        ...registerSidebarSection(
          this.$features.shouldDisplayEmbeddedDialogs(),
          {
            name: TABS.NODE_DIALOG,
            title: "Node dialog",
            icon: NodeCogIcon,
            isActive: this.isTabActive(TABS.NODE_DIALOG),
            isExpanded: this.expanded,
            onClick: () => this.clickItem(TABS.NODE_DIALOG),
          },
        ),

        ...registerSidebarSection(compatibility.isSpaceExplorerSupported(), {
          name: TABS.SPACE_EXPLORER,
          title: "Space explorer",
          icon: CubeIcon,
          isActive: this.isTabActive(TABS.SPACE_EXPLORER),
          isExpanded: this.expanded,
          onClick: () => this.clickItem(TABS.SPACE_EXPLORER),
        }),

        ...registerSidebarSection(
          this.$features.isKaiPermitted() && compatibility.isKaiSupported(),
          {
            name: TABS.KAI,
            title: "K-AI AI assistant",
            icon: AiIcon,
            isActive: this.isTabActive(TABS.KAI),
            isExpanded: this.expanded,
            onClick: () => this.clickItem(TABS.KAI),
          },
        ),
      ];
    },
  },
  watch: {
    isWorkflowEmpty: {
      handler() {
        if (this.isWorkflowEmpty) {
          this.setCurrentProjectActiveTab(TABS.NODE_REPOSITORY);
        }
      },
      immediate: true,
    },
  },
  methods: {
    ...mapMutations("panel", ["closePanel", "toggleExpanded"]),
    ...mapActions("panel", [
      "setCurrentProjectActiveTab",
      "closeExtensionPanel",
    ]),

    getDefaultTab() {
      return this.isWorkflowEmpty
        ? TABS.NODE_REPOSITORY
        : TABS.CONTEXT_AWARE_DESCRIPTION;
    },

    isTabActive(tabName: string) {
      if (!this.activeProjectId) {
        return false;
      }

      const activeTab =
        this.activeTab[this.activeProjectId] || this.getDefaultTab();

      return activeTab === tabName;
    },

    hasSection(name: string) {
      return this.sidebarSections.find((section) => section.name === name);
    },

    clickItem(tabName: string) {
      const isAlreadyActive = this.isTabActive(tabName);
      if (isAlreadyActive && this.expanded) {
        this.closePanel();
      } else {
        this.setCurrentProjectActiveTab(tabName);
      }

      this.closeExtensionPanel();
    },
  },
});
</script>

<template>
  <div class="sidebar-wrapper">
    <nav>
      <ul>
        <li
          v-for="section in sidebarSections"
          :key="section.title"
          :title="section.title"
          :class="{ active: section.isActive, expanded: section.isExpanded }"
          @click="section.onClick"
        >
          <Component :is="section.icon" />
        </li>
      </ul>
    </nav>

    <LeftCollapsiblePanel
      id="left-panel"
      width="360px"
      title="Open sidebar"
      :expanded="expanded"
      :disabled="isExtensionPanelOpen"
      @toggle-expand="toggleExpanded"
    >
      <TransitionGroup name="tab" tag="span">
        <ContextAwareDescription
          v-if="hasSection(TABS.CONTEXT_AWARE_DESCRIPTION)"
          v-show="isTabActive(TABS.CONTEXT_AWARE_DESCRIPTION)"
          key="context-aware-description"
        />

        <NodeRepository
          v-if="
            hasSection(TABS.NODE_REPOSITORY) &&
            isTabActive(TABS.NODE_REPOSITORY)
          "
          v-show="isTabActive(TABS.NODE_REPOSITORY)"
          key="node-repository"
        />

        <NodeDialogWrapper
          v-if="hasSection(TABS.NODE_DIALOG)"
          v-show="isTabActive(TABS.NODE_DIALOG)"
          key="node-dialog"
        />

        <SidebarSpaceExplorer
          v-if="hasSection(TABS.SPACE_EXPLORER)"
          v-show="isTabActive(TABS.SPACE_EXPLORER)"
          key="space-explorer"
        />

        <KaiSidebar
          v-if="hasSection(TABS.KAI)"
          v-show="isTabActive(TABS.KAI)"
          key="ai-chat"
        />
      </TransitionGroup>
    </LeftCollapsiblePanel>

    <SidebarExtensionPanel />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.sidebar-wrapper {
  --sidebar-background-color: var(--knime-porcelain);

  display: flex;
  height: 100%;
  overflow: auto;
}

nav {
  width: var(--app-side-bar-buttons-width);
  background-color: var(--knime-black);

  & ul {
    display: contents;

    & li {
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

.tab-enter-active {
  transition: all 150ms ease-in;
}

.tab-leave-active {
  transition: all 150ms ease-out;
}

.tab-enter,
.tab-leave-to {
  opacity: 0;
}
</style>
