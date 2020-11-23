<script>
import { mapState } from 'vuex';
import DataPortOutputTable from '~/components/output/DataPortOutputTable';
import OutputPortSelectorBar from '~/components/output/OutputPortSelectorBar';
import Button from '~/webapps-common/ui/components/Button';
import PlayIcon from '~/assets/execute.svg?inline';

export default {
    components: {
        OutputPortSelectorBar,
        DataPortOutputTable,
        Button,
        PlayIcon
    },
    data() {
        return {
            selectedPortIndex: null
        };
    },
    computed: {
        ...mapState('datatable', ['rows', 'totalNumRows', 'totalNumColumns']),
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
        outPorts() {
            return this.selectedNode?.outPorts || [];
        },
        needsConfiguration() {
            return this.selectedNode?.state?.executionState === 'IDLE';
        },
        needsExecution() {
            return this.selectedNode?.state?.executionState === 'CONFIGURED' &&
                this.selectedNode?.allowedActions?.canExecute;
        },
        isExecuting() {
            let executionState = this.selectedNode?.state?.executionState;
            return executionState === 'QUEUED' || executionState === 'EXECUTING';
        },
        placeholderText() {
            switch (this.selectedNodes.length) {
            case 0:
                return 'Select a node to show its output data';
            case 1:
                if (this.needsConfiguration) {
                    return 'Please first configure the selected node';
                }
                if (this.needsExecution) {
                    return 'To show the output table, please execute the selected node';
                }
                if (this.isExecuting) {
                    return 'Output is available after execution';
                }
                if (this.outPorts.length) {
                    return 'None of the selected node’s output ports contain supported data';
                }
                return 'The selected node has no output port';
            default:
                return 'Select a single node to show its output data';
            }
        },
        rowText() {
            if (this.rows.length < this.totalNumRows) {
                return `${this.rows.length} of ${this.totalNumRows}`;
            }
            return this.totalNumRows;
        }
    },
    methods: {
        // this is also called on tab initialization
        onTabChange(tab) {
            this.selectedPortIndex = tab;
            if (tab === null) {
                consola.trace('clearing data table');
                this.$store.dispatch('datatable/clear');
            } else {
                consola.trace('loading table for port', tab);
                setTimeout(() => { // delay UI blocking at startup
                    this.$store.dispatch('datatable/load', {
                        projectId: this.activeProjectId,
                        nodeId: this.selectedNode.id,
                        portIndex: this.selectedPortIndex
                    });
                }, 0);
            }
        },
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
        :node="selectedNode"
        @select="onTabChange"
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
          class="table"
        />
      </template>
      <div
        v-else
        class="placeholder"
      >
        <span>{{ placeholderText }}</span>
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
  right: 10px;
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
