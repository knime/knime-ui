<script>
import { mapState, mapGetters } from 'vuex';
import LeftCollapsiblePanel from '~knime-ui/components/LeftCollapsiblePanel';
import WorkflowMetadata from '~knime-ui/components/WorkflowMetadata';
import NodeRepository from '~knime-ui/components/noderepo/NodeRepository';

/**
 * A component that shows the tab contents belonging to one workflow,
 * i.e. toolbar, canvas, etc.
 */
export default {
    components: {
        LeftCollapsiblePanel,
        WorkflowMetadata,
        NodeRepository
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        // TODO: NXT-844 do we really need a panel store? Store and Component should at least match in name
        ...mapGetters('panel', ['workflowMetaActive', 'nodeRepositoryActive']),
        metadata() {
            // TODO: NXT-844 this needs to somehow be brought out of this component into WorkflowMetadata
            switch (this.workflow.info.containerType) {
                case 'project':
                    return this.workflow.projectMetadata || { title: this.workflow.info.name };
                case 'component': {
                    const {
                        componentMetadata: { inPorts, outPorts, name, type, icon, description, options, views }
                    } = this.workflow;
                    return {
                        title: name,
                        description,
                        nodePreview: { inPorts, outPorts, icon, type, isComponent: true, hasDynPorts: false },
                        nodeFeatures: { inPorts, outPorts, views, options },
                        isComponent: true
                    };
                }
                default:
                    return null;
            }
        },
        extensionPanelTransition() {
            // returns a functional component that is used as transition prop on <portal>. This way the transition
            // behaves as without portal, see https://portal-vue.linusb.org/api/portal-target.html#transition
            return {
                functional: true,
                render(h, context) {
                    return h('transition', { props: { name: 'extension-panel' } }, context.children);
                }
            };
        }
    }
};
</script>

<template>
  <div class="sidebar">
    <LeftCollapsiblePanel
      width="360px"
      title="Open sidebar"
    >
      <!-- TODO: NXT-844 do proper transition according to https://vuejs.org/v2/guide/transitions.html#Transitioning-Between-Components -->
      <transition name="tab-transition">
        <!-- use v-if & v-show to prevent jumping without delays -->
        <NodeRepository
          v-if="nodeRepositoryActive"
          v-show="nodeRepositoryActive"
        />
      </transition>
      <transition name="tab-transition">
        <!-- use v-if & v-show to prevent jumping without delays -->
        <WorkflowMetadata
          v-if="metadata && workflowMetaActive"
          v-show="metadata && workflowMetaActive"
          v-bind="metadata"
        />
      </transition>
    </LeftCollapsiblePanel>
    <portal-target
      slim
      name="extension-panel"
      :transition="extensionPanelTransition"
    />
  </div>
</template>

<style lang="postcss" scoped>
.sidebar {
  display: flex;
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
