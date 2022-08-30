<!-- eslint-disable brace-style -->
<script>
import { mapState, mapGetters } from 'vuex';

import Button from '~/webapps-common/ui/components/Button.vue';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg';
import PlayIcon from '~/assets/execute.svg';

import { runNodeValidationChecks, runPortValidationChecks } from './output-validator';
import PortTabs from './PortTabs.vue';
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
        ...mapGetters('selection', ['selectedNodes', 'singleSelectedNode']),

        // ========================== Conditions before loading view ============================
        // The following properties execute from top to bottom
        
        nodeErrors() {
            const { error } = runNodeValidationChecks({
                selectedNodes: this.selectedNodes,
                isDragging: this.isDragging,
                portTypes: this.portTypes
            });

            return error;
        },
        
        portErrors() {
            if (this.nodeErrors) { return true; }

            const { error } = runPortValidationChecks({
                selectedNode: this.singleSelectedNode,
                portTypes: this.portTypes,
                selectedPortIndex: this.selectedPortIndex
            });
            return error;
        },

        selectedPort() {
            if (this.nodeErrors) { return null; }

            return this.singleSelectedNode.outPorts[this.selectedPortIndex];
        },

        validationErrors() {
            return this.nodeErrors || this.portErrors || null;
        },

        /* Return validation error message or the current state of the port view */
        placeholderText() {
            if (this.validationErrors) {
                return this.validationErrors.message;
            }

            switch (this.portViewerState?.state) {
                case 'loading':
                    return 'Loading data';
                case 'error':
                    return this.portViewerState.message;
                default:
                    return null;
            }
        },

        showLoader() {
            return this.portViewerState?.state === 'loading' ||
                   this.validationErrors?.code === 'NODE_BUSY';
        },
        
        showExecuteButton() {
            return this.validationErrors?.code === 'NODE_UNEXECUTED';
        }
    },
    watch: {
        nodeErrors: {
            handler(nodeErrors) {
                if (nodeErrors) {
                    this.selectedPortIndex = null;
                    this.portViewerState = null;
                } else {
                    this.selectPort();
                }
            },

            // also set the selected port if a node is already selected before NodeOutput is created
            immediate: true,
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
    <!-- Node -->
    <PortTabs
      v-if="singleSelectedNode && singleSelectedNode.outPorts.length"
      v-model="selectedPortIndex"
      :node="singleSelectedNode"
      :disabled="Boolean(nodeErrors)"
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
      v-if="!nodeErrors && !portErrors"
      :project-id="projectId"
      :workflow-id="workflowId"
      :selected-node="singleSelectedNode"
      :selected-port-index="Number(selectedPortIndex)"
      class="port-view"
      @state-change="portViewerState = $event"
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
