<script>
import { mapState, mapGetters } from 'vuex';
import PortTabs from '~/components/output/PortTabs.vue';
import Button from '~/webapps-common/ui/components/Button.vue';
import PlayIcon from '~/assets/execute.svg?inline';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';
import { runNodeValidationChecks, runPortValidationChecks } from './output-validator';

import PortViewLoader from './PortViewLoader.vue';


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
        PortViewLoader
    },
    data() {
        return {
            selectedPortIndex: null,
            portViewerState: null
        };
    },
    computed: {
        ...mapState('application', { projectId: 'activeProjectId', portTypes: 'availablePortTypes' }),
        ...mapState('workflow', { workflowId: state => state.activeWorkflow.info.containerId }),
        ...mapGetters('workflow', { isDragging: 'isDragging' }),
        ...mapGetters('selection', ['selectedNodes']),

        nodeErrors() {
            const { error } = runNodeValidationChecks({
                selectedNodes: this.selectedNodes,
                isDragging: this.isDragging,
                portTypes: this.portTypes
            });
            
            if (!error) {
                return null;
            }

            return error;
        },

        hasNodeErrors() {
            return Boolean(this.nodeErrors);
        },

        selectedNode() {
            if (this.selectedNodes.length === 1) {
                const [selectedNode] = this.selectedNodes;
                return selectedNode;
            }

            return null;
        },
        
        portErrors() {
            if (!this.hasNodeErrors) {
                const { error } = runPortValidationChecks({
                    selectedNode: this.selectedNode,
                    portTypes: this.portTypes,
                    selectedPortIndex: this.selectedPortIndex
                });
                
                if (!error) {
                    return null;
                }
    
                return error;
            }
            
            return true;
        },

        hasPortErrors() {
            return Boolean(this.portErrors);
        },

        selectedPort() {
            if (!this.hasNodeErrors) {
                return this.selectedNode.outPorts[this.selectedPortIndex];
            }

            return null;
        },

        validationErrors() {
            const validationError = this.nodeErrors || this.portErrors || null;
            return validationError;
        },

        hasValidationErrors() {
            return Boolean(this.validationErrors);
        },

        placeholderText() {
            if (this.hasValidationErrors) {
                return this.validationErrors.message;
            }

            const { state, message } = this.portViewerState || {};

            if (state === 'loading') {
                return 'Loading data';
            }

            if (state === 'error') {
                return message;
            }

            return null;
        },

        showLoader() {
            const { code } = this.hasValidationErrors ? this.validationErrors : {};
            const { state } = this.portViewerState || {};
            return state === 'loading' || code === 'NODE_BUSY';
        },
        
        showExecuteButton() {
            const { code } = this.hasValidationErrors ? this.validationErrors : {};
            return code === 'NODE_UNEXECUTED';
        }
    },
    watch: {
        nodeErrors: {
            handler() {
                if (this.hasNodeErrors) {
                    this.selectedPortIndex = null;
                    this.portViewerState = null;
                } else {
                    this.selectPort();
                }
            },
            immediate: true,
            deep: true
        }
    },
    methods: {
        // when switching between nodes, best effort is made to ensure that the selected port number remains constant
        // If another node is selected that doesn't have the previously selected port, (eg. no flow variables)
        // then a default for that kind of node is used and the previously selected port is overwritten
        selectPort() {
            let node = this.selectedNode;
            // check if the currently selected port exists on that node, otherwise set a default
            if (!node.outPorts[this.selectedPortIndex]) {
                // for metanodes: 0, node with one port (flowVariables): 0, node with multiple ports: 1 (not flowVariables)
                let defaultSelectedPort = node.kind === 'metanode' || node.outPorts.length === 1 ? '0' : '1';
                this.selectedPortIndex = defaultSelectedPort;
                return true;
            }
            return false;
        },
        executeNode() {
            this.$store.dispatch('workflow/executeNodes', [this.selectedNode.id]);
        }
    }
};
</script>

<template>
  <div class="output-container">
    <!-- Node -->
    <PortTabs
      v-if="selectedNode && selectedNode.outPorts.length"
      v-model="selectedPortIndex"
      :node="selectedNode"
      :disabled="hasNodeErrors"
    />
    
    <!-- Error Message and Placeholder -->
    <div
      v-if="placeholderText"
      :class="['placeholder', { isViewerLoading: portViewerState && portViewerState.state === 'loading' }]"
    >
      <span>
        <ReloadIcon
          v-if="showLoader"
          class="loading-icon"
        />
        {{ placeholderText }}
      </span>
      <Button
        v-if="showExecuteButton"
        class="action-button"
        primary
        compact
        @click="executeNode"
      >
        <PlayIcon />
        Execute
      </Button>
    </div>
    
    <!-- Port Viewer -->
    <PortViewLoader
      v-if="!hasNodeErrors && !hasPortErrors"
      :project-id="projectId"
      :workflow-id="workflowId"
      :selected-node="selectedNode"
      :selected-port-index="Number(selectedPortIndex)"
      class="port-view"
      @viewer-state="portViewerState = $event"
    />
  </div>
</template>

<style lang="postcss" scoped>
@keyframes spin {
  100% {
    transform: rotate(-360deg);
  }
}

@keyframes show {
  from { opacity: 0; }
  to { opacity: 1; }
}

.output-container {
  height: 100%;
  padding: 10px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  contain: strict;
}

.port-view {
  flex-shrink: 1;
  overflow-y: auto;
}

.placeholder {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  &.isViewerLoading {
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
      animation: spin 2s linear infinite;
      width: 24px;
      height: 24px;
      stroke-width: calc(32px / 24);
      margin: auto;
      stroke: var(--knime-masala);
      vertical-align: -6px;
      margin-right: 10px;
    }
  }
}

.action-button {
  margin-top: 20px;

  & >>> svg {
    border-radius: 12px;
    background: var(--knime-white);
    border: 1px solid var(--knime-masala);
    stroke: var(--knime-masala) !important;
  }
}
</style>
