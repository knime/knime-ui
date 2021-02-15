<script>
import { mapState } from 'vuex';
import DataPortOutputTable from '~/components/output/DataPortOutputTable';
import FlowVariablePortOutputTable from '~/components/output/FlowVariablePortOutputTable';
import OutputPortSelectorBar from '~/components/output/OutputPortSelectorBar';
import Button from '~/webapps-common/ui/components/Button';
import PlayIcon from '~/assets/execute.svg?inline';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';

export const supportsPort = port => port.type === 'table' || port.type === 'flowVariable';

/**
 * Node output panel, displaying output port selection bar and output table if available, respectively.
 * The control flow is as follows:
 * 1. node is selected
 * 2. This component clears the dataTable
 * 3. OutputPortSelectorBar is initialized (if node has output ports)
 * 4. OutputPortSelectorBar determines which tabs to render / preselect
 * 5. OutputPortSelectorBar fires "select" event
 * 6. This component loads the dataTable
 * 7. When user switches tabs, goto 5
 * 8. When user switches nodes, goto 1
 */
export default {
    components: {
        OutputPortSelectorBar,
        DataPortOutputTable,
        FlowVariablePortOutputTable,
        Button,
        ReloadIcon,
        PlayIcon
    },
    data() {
        return {
            selectedPortIndex: null
        };
    },
    computed: {
        ...mapState('dataTable', ['rows', 'totalNumRows', 'totalNumColumns']),
        ...mapState('workflow', {
            nodes: state => state.activeWorkflow.nodes
        }),
        ...mapState('openedProjects', {
            activeProjectId: 'activeId'
        }),
        selectedNodes() {
            let nodes = Object.values(this.nodes || {});
            return nodes.filter(node => node.selected);
        },
        selectedNode() {
            if (this.selectedNodes.length === 1) {
                return this.selectedNodes[0];
            }
            return null;
        },
        isMetaNode() {
            return this.selectedNode?.kind === 'metanode';
        },
        outPorts() {
            return this.selectedNode?.outPorts || [];
        },
        needsConfiguration() {
            return this.selectedNode?.state?.executionState === 'IDLE' && !this.isMetaNode;
        },
        needsExecution() {
            return this.isSupported && this.selectedNode?.allowedActions?.canExecute;
        },
        isExecuting() {
            let executionState = this.selectedNode?.state?.executionState;
            return executionState === 'QUEUED' || executionState === 'EXECUTING';
        },
        isSupported() {
            return this.outPorts.some(port => supportsPort(port));
        },
        placeholderText() {
            switch (this.selectedNodes.length) {
            case 0:
                return 'To show the node output, please select a configured or executed node';
            case 1:
                if (!this.outPorts.length) {
                    return 'The selected node has no output ports';
                }
                if (!this.isSupported) {
                    return 'The selected node has no supported output port';
                }
                if (this.needsExecution) {
                    return 'To show the output table, please execute the selected node';
                }
                if (this.needsConfiguration) {
                    return 'Please first configure the selected node';
                }
                if (this.isExecuting) {
                    return 'Output is available after execution';
                }
                return 'No output available';
            default:
                return 'To show the node output, please select only one node';
            }
        },
        rowText() {
            if (this.rows.length < this.totalNumRows) {
                return `${this.rows.length} of ${this.totalNumRows}`;
            }
            return this.totalNumRows;
        },
        // returns the type of the selected output port
        selectedPortIndexType() {
            return this.outPorts[this.selectedPortIndex]?.type;
        }
    },
    watch: {
        selectedNode(newNode, oldNode) {
            if (oldNode !== newNode) {
                this.selectedPortIndex = null;
            }
        },
        selectedPortIndex(tab) {
            if (tab === null) {
                consola.trace('clearing data table');
                this.$store.dispatch('dataTable/clear');
                this.$store.dispatch('flowVariables/clear');
                // If the node has available data, the OutputPortSelectorBar will update the selectedPortIndex at this
                // point via v-model, selecting the first available tab index, and we will eventually end up in the
                // "else" branch below
            } else {
                consola.trace('loading table for port', tab);
                // Either loads the data from the dataTable api or the flowVariables api
                let dataSource = (this.outPorts[tab]?.type === 'flowVariable') ? 'flowVariables' : 'dataTable';
                setTimeout(() => { // delay UI blocking at startup
                    this.$store.dispatch(`${dataSource}/load`, {
                        projectId: this.activeProjectId,
                        nodeId: this.selectedNode.id,
                        portIndex: this.selectedPortIndex
                    });
                }, 0);
            }
        }
    },
    methods: {
        executeNode() {
            this.$store.dispatch('workflow/executeNodes', {
                nodeIds: [this.selectedNode.id]
            });
        }
    }
};
</script>

<template>
  <div class="output-container">
    <template v-if="selectedNode && outPorts.length > 0">
      <OutputPortSelectorBar
        v-model="selectedPortIndex"
        :node="selectedNode"
      />
      <template v-if="selectedPortIndex !== null">
        <span
          v-if="rows"
          class="counts"
        >
          <span class="count">Rows: {{ rowText }}</span><!--
        --><span class="count">Columns: {{ totalNumColumns }}</span>
        </span>
        <DataPortOutputTable
          v-if="selectedPortIndexType === 'table'"
          class="table"
        />
        <FlowVariablePortOutputTable
          v-else-if="selectedPortIndexType === 'flowVariable'"
          class="table"
        />
      </template>
      <div
        v-else
        class="placeholder"
      >
        <span>
          <ReloadIcon
            v-if="isExecuting"
            class="loading-icon"
          />
          {{ placeholderText }}</span>
        <!--Button v-if="needsConfiguration"></Button--> <!-- TODO: implement NXT-21 -->
        <Button
          v-if="needsExecution"
          class="action-button"
          primary
          compact
          @click="executeNode"
        >
          <PlayIcon />
          Execute
        </Button>
      </div>
    </template>
    <div
      v-else
      class="placeholder"
    >
      <span>{{ placeholderText }}</span>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@keyframes spin {
  100% {
    transform: rotate(-360deg);
  }
}

.output-container {
  padding: 10px;
  border-top: 1px solid var(--knime-silver-sand);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.counts {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  height: 19px;
  line-height: 19px;
  top: 75px;
  font-size: 14px;
}

.count {
  padding-left: 8px;

  &:not(:last-child) {
    padding-right: 8px;
    border-right: 1px solid var(--knime-silver-sand);
  }
}

.table {
  margin-top: 25px;
  flex-shrink: 1;
}

.placeholder {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

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
