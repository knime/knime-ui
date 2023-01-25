<script>
/* eslint-disable brace-style */
import { mapState, mapGetters } from 'vuex';

import Button from 'webapps-common/ui/components/Button.vue';
import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';
import PlayIcon from '@/assets/execute.svg';

import PortTabs from './PortTabs.vue';
import PortViewTabOutput from './PortViewTabOutput.vue';
import NodeViewTabOutput from './NodeViewTabOutput.vue';

import { buildMiddleware, validateDragging, validateSelection } from './output-validator';

export const runValidationChecks = ({ selectedNodes, isDragging }) => {
    const validationMiddleware = buildMiddleware(
        validateDragging,
        validateSelection
    );

    const result = validationMiddleware({ selectedNodes, isDragging })();

    return Object.freeze(result);
};

/**
 * Node output panel, displaying output port selection bar and port view if possible.
 * Port view will be rendered dynamically based on the port type
 */
export default {
    components: {
        PortTabs,
        Button,
        ReloadIcon,
        PlayIcon,
        PortViewTabOutput,
        NodeViewTabOutput
    },
    data() {
        return {
            selectedTab: '',
            outputState: null
        };
    },
    computed: {
        ...mapState('application', { projectId: 'activeProjectId', availablePortTypes: 'availablePortTypes' }),
        ...mapState('workflow', { workflowId: state => state.activeWorkflow.info.containerId }),
        ...mapGetters('selection', ['selectedNodes', 'singleSelectedNode']),
        ...mapGetters('workflow', { isDragging: 'isDragging' }),

        canSelectTabs() {
            // allow selecting tabs when:
            return (
                // doesn't have errors in the output state
                !this.outputState?.error ||
                // or when it doesn't have these specific error types
                (
                    this.outputState?.error?.code !== 'NO_SUPPORTED_PORTS' &&
                    this.outputState?.error?.code !== 'NODE_DRAGGING'
                )
            );
        },

        isViewTabSelected() {
            return this.selectedTab === 'view';
        },

        selectedPortIndex: {
            get() {
                return this.isViewTabSelected ? null : this.selectedTab;
            },
            set(value) {
                this.selectedTab = value;
            }
        },

        validationErrors() {
            const { error } = runValidationChecks({
                selectedNodes: this.selectedNodes,
                isDragging: this.isDragging
            });

            return error;
        }
    },
    watch: {
        validationErrors: {
            handler(validationErrors) {
                if (validationErrors) {
                    this.outputState = {
                        message: this.validationErrors.message,
                        error: validationErrors
                    };
                } else {
                    this.selectPort();
                }
            },
            // trigger the port selection as soon as the component mounts, based on the validation results
            immediate: true,
            // watcher won't trigger when the value hasn't been assigned a new value (e.g it stays the same),
            // and that is the case because the computed property has cached it. But we deep watch to select the port
            // and update the output state every time the validations retrigger
            deep: true
        }
    },
    methods: {
        // When switching between nodes, best effort is made to ensure that the selected port number remains constant
        // If another node is selected that doesn't have the previously selected port, (eg. no flow variables)
        // then a default for that kind of node is used and the previously selected port is overwritten
        selectPort() {
            let { outPorts, kind: nodeKind } = this.singleSelectedNode;

            // check if the currently selected port exists on that node
            if (outPorts[this.selectedPortIndex]) {
                // keep selected port index;
                return;
            }

            // if we're moving to a node which has a view skip automatic port selection
            if (this.singleSelectedNode.hasView && this.$features.shouldDisplayEmbeddedViews()) {
                this.selectedTab = 'view';
                return;
            }

            if (nodeKind === 'metanode') {
                // chose the first node of a metanode
                this.selectedPortIndex = '0';
            } else {
                // node is component or native node
                // select mickey-mouse port, if it is the only one, otherwise the first regular port
                this.selectedPortIndex = outPorts.length > 1 ? '1' : '0';
            }
        },
        executeNode() {
            this.$store.dispatch('workflow/executeNodes', [this.singleSelectedNode.id]);
        }
    }
};
</script>

<template>
  <div class="output-container">
    <PortTabs
      v-if="singleSelectedNode && singleSelectedNode.outPorts.length"
      v-model="selectedTab"
      :has-view-tab="singleSelectedNode.hasView"
      :node="singleSelectedNode"
      :disabled="!canSelectTabs"
    />
    
    <!-- Error Message / Placeholder message -->
    <div
      v-if="outputState"
      :class="['placeholder', { 'is-viewer-loading': outputState.loading }]"
    >
      <span>
        <ReloadIcon
          v-if="outputState.loading"
          class="loading-icon"
        />
        {{ outputState.message }}
      </span>
      <Button
        v-if="outputState.error && outputState.error.code === 'NODE_UNEXECUTED'"
        class="action-button"
        primary
        compact
        @click="executeNode"
      >
        <PlayIcon />
        Execute
      </Button>
    </div>

    <template v-if="!validationErrors">
      <NodeViewTabOutput
        v-if="isViewTabSelected && $features.shouldDisplayEmbeddedViews()"
        :project-id="projectId"
        :workflow-id="workflowId"
        :selected-node="singleSelectedNode"
        :available-port-types="availablePortTypes"
        class="output"
        @output-state-change="outputState = $event"
      />

      <PortViewTabOutput
        v-if="!isViewTabSelected"
        :project-id="projectId"
        :workflow-id="workflowId"
        :selected-node="singleSelectedNode"
        :selected-port-index="selectedPortIndex"
        :available-port-types="availablePortTypes"
        class="output"
        @output-state-change="outputState = $event"
      />
    </template>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

@keyframes spin {
  100% {
    transform: rotate(-360deg);
  }
}

@keyframes show {
  from { opacity: 0; }
  to { opacity: 1; }
}

.output {
  flex-shrink: 1;
  overflow-y: auto;
}

.placeholder {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  & .is-viewer-loading {
    /* Wait for a short amount of time before rendering loading placeholder
       to prevent flickering when the table loads very quickly */
    animation: show 100ms ease-in 150ms;
    animation-fill-mode: both;
  }

  & span {
    font-size: 16px;
    text-align: center;
    font-style: italic;
    color: var(--knime-masala);

    & .loading-icon {
      @mixin svg-icon-size 24;

      animation: spin 2s linear infinite;
      margin: auto;
      stroke: var(--knime-masala);
      vertical-align: -6px;
      margin-right: 10px;
    }
  }
}

.output-container {
  height: 100%;
  padding: 10px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  contain: strict;

  & :deep(.tab-bar) {
    padding-top: 0;
    padding-bottom: 0;

    & span {
      font-size: 13px;
      line-height: 61px;
    }
  }
}

.action-button {
  margin-top: 20px;

  & :deep(svg) {
    border-radius: 12px;
    background: var(--knime-white);
    border: 1px solid var(--knime-masala);
    stroke: var(--knime-masala) !important;
  }
}
</style>
