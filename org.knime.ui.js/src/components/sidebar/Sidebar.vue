<script lang="ts">
import { defineAsyncComponent, defineComponent } from "vue";
import type { FunctionalComponent, SVGAttributes } from "vue";
import { mapState, mapActions, mapMutations } from "vuex";

import NodeCogIcon from "webapps-common/ui/assets/img/icons/node-cog.svg";
import CubeIcon from "webapps-common/ui/assets/img/icons/cube.svg";
import PlusIcon from "webapps-common/ui/assets/img/icons/node-stack.svg";
import ChatIcon from "webapps-common/ui/assets/img/icons/forum.svg";

import { environment } from "@/environment";
import MetainfoIcon from "@/assets/metainfo.svg";
import { TABS } from "@/store/panel";

import LeftCollapsiblePanel from "./LeftCollapsiblePanel.vue";

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
    ContextAwareDescription: defineAsyncComponent(
      () => import("@/components/sidebar/ContextAwareDescription.vue"),
    ),
    NodeRepository: defineAsyncComponent(
      () => import("@/components/nodeRepository/NodeRepository.vue"),
    ),
    NodeDialogWrapper: defineAsyncComponent(
      () => import("@/components/embeddedViews/NodeDialogWrapper.vue"),
    ),
    SidebarSpaceExplorer: defineAsyncComponent(
      () => import("@/components/sidebar/SidebarSpaceExplorer.vue"),
    ),
    AiAssistant: defineAsyncComponent(
      () => import("@/components/sidebar/aiAssistant/AiAssistant.vue"),
    ),
  },
  data() {
    return {
      TABS: Object.freeze(TABS),
    };
  },
  computed: {
    ...mapState("panel", ["activeTab", "expanded"]),
    ...mapState("application", ["activeProjectId"]),
    ...mapState("nodeRepository", ["isDescriptionPanelOpen"]),

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
          title: "Node repository",
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

        ...registerSidebarSection(environment === "DESKTOP", {
          name: TABS.SPACE_EXPLORER,
          title: "Space explorer",
          icon: CubeIcon,
          isActive: this.isTabActive(TABS.SPACE_EXPLORER),
          isExpanded: this.expanded,
          onClick: () => this.clickItem(TABS.SPACE_EXPLORER),
        }),

        ...registerSidebarSection(
          this.$features.shouldShowAiAssistant() && environment === "DESKTOP",
          {
            name: TABS.AI_CHAT,
            title: "AI Chat",
            icon: ChatIcon,
            isActive: this.isTabActive(TABS.AI_CHAT),
            isExpanded: this.expanded,
            onClick: () => this.clickItem(TABS.AI_CHAT),
          },
        ),
      ];
    },
  },
  methods: {
    ...mapMutations("panel", ["closePanel", "toggleExpanded"]),
    ...mapActions("panel", ["setCurrentProjectActiveTab"]),
    ...mapActions("nodeRepository", ["closeDescriptionPanel"]),

    isTabActive(tabName: string) {
      if (!this.activeProjectId) {
        return false;
      }
      const activeTab =
        this.activeTab[this.activeProjectId] || TABS.CONTEXT_AWARE_DESCRIPTION;
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

      this.closeDescriptionPanel();
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
      :disabled="isDescriptionPanelOpen && isTabActive(TABS.NODE_REPOSITORY)"
      @toggle-expand="toggleExpanded"
    >
      <TransitionGroup name="tab" tag="span">
        <NodeRepository
          v-if="hasSection(TABS.NODE_REPOSITORY)"
          v-show="isTabActive(TABS.NODE_REPOSITORY)"
          key="node-repository"
        />

        <ContextAwareDescription
          v-if="hasSection(TABS.CONTEXT_AWARE_DESCRIPTION)"
          v-show="isTabActive(TABS.CONTEXT_AWARE_DESCRIPTION)"
          key="context-aware-description"
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

        <AiAssistant
          v-if="hasSection(TABS.AI_CHAT)"
          v-show="isTabActive(TABS.AI_CHAT)"
          key="ai-chat"
        />
      </TransitionGroup>
    </LeftCollapsiblePanel>

    <PortalTarget tag="div" name="extension-panel" />
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
        background-color: var(--knime-porcelain);

        &.expanded {
          background-color: var(--knime-porcelain);
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
