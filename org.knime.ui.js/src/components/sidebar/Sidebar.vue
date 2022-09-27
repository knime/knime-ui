<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import InfoIcon from 'webapps-common/ui/assets/img/icons/circle-info.svg';
import PlusIcon from 'webapps-common/ui/assets/img/icons/circle-plus.svg';

import WorkflowMetadata from '@/components/workflowMetadata/WorkflowMetadata.vue';
import NodeRepository from '@/components/nodeRepository/NodeRepository.vue';
import LeftCollapsiblePanel from './LeftCollapsiblePanel.vue';

export default {
    components: {
        InfoIcon,
        PlusIcon,
        LeftCollapsiblePanel,
        WorkflowMetadata,
        NodeRepository
    },
    computed: {
        ...mapState('panel', ['activeTab', 'expanded']),
        ...mapState('nodeRepository', ['isDescriptionPanelOpen']),
        ...mapGetters('panel', ['isWorkflowMetaActive', 'isNodeRepositoryActive']),
        extensionPanelTransition() {
            // returns a functional component that is used as transition prop on <portal>. This way the transition
            // behaves as without portal, see https://portal-vue.linusb.org/api/portal-target.html#transition
            return {
                render(h) {
                    return h('transition', { props: { name: 'extension-panel' } }, this.$slots.default);
                }
            };
        }
    },
    methods: {
        ...mapActions('panel', ['setWorkflowMetaActive', 'setNodeRepositoryActive', 'close', 'toggleExpanded']),
        ...mapActions('nodeRepository', ['closeDescriptionPanel']),
        clickItem(alreadyActive, setActive) {
            if (alreadyActive && this.expanded) {
                this.close();
            } else {
                setActive();
            }

            this.closeDescriptionPanel();
        }
    }
};
</script>

<template>
  <div class="sidebar-wrapper">
    <nav>
      <ul>
        <li
          :class="{ active: isWorkflowMetaActive, expanded }"
          title="Workflow metadata"
          @click="clickItem(isWorkflowMetaActive, setWorkflowMetaActive)"
        >
          <InfoIcon />
        </li>
        <li
          :class="{ active: isNodeRepositoryActive, expanded }"
          title="Node repository"
          @click="clickItem(isNodeRepositoryActive, setNodeRepositoryActive)"
        >
          <PlusIcon />
        </li>
      </ul>
    </nav>

    <LeftCollapsiblePanel
      id="left-panel"
      width="360px"
      title="Open sidebar"
      :expanded="expanded"
      :disabled="isDescriptionPanelOpen && isNodeRepositoryActive"
      @toggle-expand="toggleExpanded"
    >
      <transition-group name="tab-transition">
        <NodeRepository
          v-show="isNodeRepositoryActive"
          key="node-repository"
        />

        <WorkflowMetadata
          v-show="isWorkflowMetaActive"
          key="workflow-metadata"
        />
      </transition-group>
    </LeftCollapsiblePanel>

    <portal-target
      slim
      name="extension-panel"
      :transition="extensionPanelTransition"
    />
  </div>
</template>

<style lang="postcss" scoped>
.sidebar-wrapper {
  display: flex;
  height: 100%;
  overflow: auto;
}

nav {
  width: var(--side-bar-width);
  background-color: var(--knime-black);

  & ul {
    display: contents;

    & li {
      height: 50px;
      width: 40px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background-color: var(--knime-silver-sand);
      border-bottom: 1px var(--knime-black) solid;
      transition: background-color 150ms ease-out;

      & svg {
        height: 30px;
      }

      &.active {
        background-color: var(--knime-porcelain);

        &.expanded {
          background-color: var(--knime-gray-ultra-light);
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

  & >>> .container {
    /* prevent scrollbar jump when switching between tabs in the LeftCollapsiblePanel */
    overflow-y: hidden;
  }
}

.extension-panel-enter-active {
  transition: all 50ms ease-in;
}

.extension-panel-leave-active {
  transition: all 50ms ease-out;
}

.extension-panel-enter,
.extension-panel-leave-to {
  opacity: 0;
}

.tab-transition-enter-active {
  transition: all 150ms ease-in;
}

.tab-transition-leave-active {
  transition: all 150ms ease-out;
}

.tab-transition-enter,
.tab-transition-leave-to {
  opacity: 0;
}
</style>
