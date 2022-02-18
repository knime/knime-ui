<script>
import { mapState, mapGetters } from 'vuex';
import LeftCollapsiblePanel from '~/components/LeftCollapsiblePanel';
import WorkflowMetadata from '~/components/WorkflowMetadata';
import NodeRepository from '~/components/noderepo/NodeRepository';
import NodeDescription from '~/components/noderepo/NodeDescription';

/**
 * A component that shows the tab contents belonging to one workflow,
 * i.e. toolbar, canvas, etc.
 */
export default {
    components: {
        LeftCollapsiblePanel,
        WorkflowMetadata,
        NodeRepository,
        NodeDescription
    },
    computed: {
        ...mapState('workflow', {
            workflow: 'activeWorkflow'
        }),
        ...mapState('panel', ['descriptionPanel']),
        // TODO: NXT-844 do we really need a panel store?
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
      <transition name="panel-fade">
        <!-- use v-if & v-show to prevent jumping without delays -->
        <NodeRepository
          v-if="nodeRepositoryActive"
          v-show="nodeRepositoryActive"
        />
      </transition>
      <transition name="panel-fade">
        <!-- use v-if & v-show to prevent jumping without delays -->
        <WorkflowMetadata
          v-if="metadata && workflowMetaActive"
          v-show="metadata && workflowMetaActive"
          v-bind="metadata"
        />
      </transition>
    </LeftCollapsiblePanel>
    <NodeDescription
      v-if="descriptionPanel"
    />
  </div>
</template>

<style lang="postcss" scoped>
.sidebar {
  display: flex;
}

.panel-fade-enter-active {
  transition: all 150ms ease-in;
}

.panel-fade-leave-active {
  transition: all 150ms ease-out;
}

.panel-fade-enter,
.panel-fade-leave-to {
  opacity: 0;
}
</style>
