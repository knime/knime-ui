<script>
import { mapState, mapGetters } from 'vuex';
import TablePortView from '~/components/output/TablePortView';
import FlowVariablePortView from '~/components/output/FlowVariablePortView';
import PortTabs from '~/components/output/PortTabs';
import Button from '~/webapps-common/ui/components/Button';
import PlayIcon from '~/assets/execute.svg?inline';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';
import { getPortView } from '~api';

const needsExecutionMessage = 'To show the output table, please execute the selected node.';
const outputAvailableAfterExecutionMessage = 'Output is available after execution.';

/**
 * Node output panel, displaying output port selection bar and port view if possible.
 */

export default {
    components: {
        PortTabs,
        TablePortView,
        FlowVariablePortView,
        Button,
        ReloadIcon,
        PlayIcon
    },
    data() {
        return {
            selectedPortIndex: null,
            portViewerState: null,
            componentId: null,
            initialData: null
        };
    },
    computed: {
        ...mapState('application', { projectId: 'activeProjectId', portTypes: 'availablePortTypes' }),
        ...mapState('workflow', { workflowId: state => state.activeWorkflow.info.containerId }),
        ...mapGetters('workflow', { isDragging: 'isDragging' }),
        
        // ========================== Sanity Check ============================
        // The following properties execute from top to bottom
        
        // Watch selected nodes
        selectedNodes() {
            return this.$store.getters['selection/selectedNodes'];
        },

        // Step 1: make sure only one node is selected
        selectionHasProblem() {
            if (this.selectedNodes.length === 0) {
                return 'To show the node output, please select a configured or executed node.';
            } else if (this.selectedNodes.length > 1) {
                return 'To show the node output, please select only one node.';
            }
            return false;
        },
        
        // If Step 1 is successful, return selected node
        selectedNode() {
            return this.selectionHasProblem ? null : this.selectedNodes[0];
        },

        // Step 2: check whether the node's ports can be displayed in principal
        // This property is $watched and the selected port is updated upon change
        nodeHasProblem() {
            let node = this.selectedNode;
            if (!node) {
                return 'No node selected';
            }

            if (this.isDragging && !this.isViewerReady) {
                return 'Node output will be loaded after moving is completed';
            }

            if (!node.outPorts.length) {
                return 'The selected node has no output ports.';
            }

            // check if node has at least one supported port
            if (!node.outPorts.some(port => this.supportsPort(port))) {
                return 'The selected node has no supported output port.';
            }
            
            let state = node.state?.executionState;
            if (state === 'IDLE') {
                return 'Please first configure the selected node.';
            }

            return false;
        },

        // If Step 2 is successful, return selected port
        selectedPort() {
            return this.nodeHasProblem ? null : this.selectedNode.outPorts[this.selectedPortIndex];
        },

        // Return port kind only if a port was selected, otherwise return 'null'
        selectedPortKind() {
            const port = this.selectedPort;
            return port ? this.getPortType(port).kind : null;
        },

        // Step 3: check whether the selected port can be displayed
        portHasProblem() {
            let port = this.selectedPort;
            if (!port) {
                return 'No port selected';
            }
                            
            if (!this.supportsPort(port)) {
                return 'The data at the output port is not supported by any viewer.';
            }

            if (port.inactive) {
                return 'This output port is inactive and therefore no data table is available.';
            }

            // only flow-variables can be shown if node hasn't yet executed
            if (this.selectedPortKind !== 'flowVariable') {
                if (this.selectedNode.allowedActions.canExecute) {
                    return needsExecutionMessage;
                }
                let state = this.selectedNode.state.executionState;
                if (state === 'QUEUED' || state === 'EXECUTING') {
                    return outputAvailableAfterExecutionMessage;
                }
            }
            
            return false;
        },

        // If Step 3 is successful, return necessary data for the port views
        portIdentifier() {
            if (this.portHasProblem) {
                return null;
            }

            const { projectId, workflowId, selectedNode: { id: nodeId }, selectedPortIndex, selectedPort } = this;

            return {
                projectId,
                workflowId,
                nodeId,
                portIndex: Number(selectedPortIndex),
                // using UNIQUE keys for all possible ports in knime-ui ensures that a new port view instance is created upon switching ports
                // port object version changes whenever a port state has updated. "ABA"-Changes on the port will always trigger a re-render.
                key: [projectId, workflowId, nodeId, selectedPortIndex, selectedPort.portObjectVersion].join('/')
            };
        },

        // Combines node and port to be able to watch those at the same time
        selectedNodeAndPort() {
            return { node: this.selectedNode, port: this.selectedPort };
        },

        // ========================== UI ===========================
        // A port view can be in one of the following states ['loading', 'error' & message, 'ready']
        isViewerReady() {
            return this.portViewerState?.state === 'ready';
        },
        isViewerLoading() {
            return this.portViewerState?.state === 'loading';
        },
        placeholderText() {
            let { portViewerState } = this;
            return this.selectionHasProblem || this.nodeHasProblem || this.portHasProblem ||
                // same loading placeholder for all port views
                (this.isViewerLoading && 'Loading data') ||
                // custom error message per port view
                (portViewerState?.state === 'error' && portViewerState.message);
        },
        showExecuteButton() {
            return this.placeholderText === needsExecutionMessage;
        },
        showLoader() {
            return this.placeholderText === outputAvailableAfterExecutionMessage || this.isViewerLoading;
        }
    },
    watch: {
        // When the selected node or its state changes, the selected port has to be updated
        
        nodeHasProblem(hasProblem) {
            if (!hasProblem) {
                // if the selected node can be used, select port
                this.selectPort();
            } else if (hasProblem) {
                // if the node can't be used, set selected port to null
                this.selectedPortIndex = null;
            }
        },
        portHasProblem(hasProblem) {
            if (hasProblem) {
                this.portViewerState = null;
            }
        },
        selectedNodeAndPort: {
            handler(newNodeAndPort, oldNodeAndPort) {
                this.portViewerState = null;
                this.componentId = null;
                const oldNodeId = oldNodeAndPort?.node?.id;
                const newNodeId = newNodeAndPort?.node?.id;
                let newPortSelected = false;
                if (oldNodeId !== newNodeId && !this.nodeHasProblem) {
                    consola.trace('Selected Node changed to', newNodeId);
                    // TODO temporary hack to be fixed with NXT-632
                    // prevents the port view being loaded twice because the 'selectPort' function will
                    // possibly cause this watcher to be called again
                    newPortSelected = this.selectPort();
                }
                if (!newPortSelected && !this.nodeHasProblem && !this.portHasProblem) {
                    this.loadPortView();
                }
            },
            // also set the selected port if a node is already selected before NodeOutput is created
            immediate: true
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
        async loadPortView() {
            this.portViewerState = { state: 'loading' };

            let { projectId, workflowId, nodeId, portIndex } = this.portIdentifier;
            try {
                const portView = await getPortView(projectId, workflowId, nodeId, portIndex);

                let resourceInfo = portView.resourceInfo;
                let resourceType = resourceInfo.type;

                if (resourceType === 'VUE_COMPONENT_REFERENCE') {
                    this.componentId = resourceInfo.id;
                    this.initialData = JSON.parse(portView.initialData).result;
                    this.portViewerState = { state: 'ready' };
                } else if (resourceType === 'VUE_COMPONENT_LIB') {
                // TODO NXT-632
                // let resourceLocation = resourceInfo.baseUrl + resourceInfo.path;
                // check if component library needs to be loaded or if it was already loaded before
                // if (!window[componentId]) {
                //    await loadComponentLibrary(window, resourceLocation, componentId);
                // }
                // register the component locally
                // this.$options.components[componentId] = window[componentId];
                // this.componentId = componentId;
                // this.componentLoaded = true;
                // ... create knime service and inject
                }
            } catch (e) {
                this.portViewerState = { state: 'error', message: e };
            }
        },
        executeNode() {
            this.$store.dispatch('workflow/executeNodes', [this.selectedNode.id]);
        },
        // Get port type from port
        getPortType(port) {
            return this.portTypes[port.typeId];
        },
        // Check if port is supported
        supportsPort(port) {
            try {
                const portKind = this.getPortType(port).kind;
                return portKind === 'table' || portKind === 'flowVariable';
            } catch {
                return false;
            }
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
      :disabled="Boolean(nodeHasProblem)"
    />
    <!-- Error Message and Placeholder -->
    <div
      v-if="placeholderText"
      :class="['placeholder', {isViewerLoading}]"
    >
      <span>
        <ReloadIcon
          v-if="showLoader"
          class="loading-icon"
        />
        {{ placeholderText }}</span>
      <!--Button v-if="needsConfiguration"></Button--> <!-- TODO: implement NXT-21 -->
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
    <component
      :is="componentId"
      v-if="!portHasProblem && componentId"
      v-show="isViewerReady"
      v-bind="portIdentifier"
      :initial-data="initialData"
      class="port-view"
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
