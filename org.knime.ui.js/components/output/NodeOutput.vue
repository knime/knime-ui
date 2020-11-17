<script>
import { mapState } from 'vuex';
import DataPortOutputTable from '~/components/output/DataPortOutputTable';
import OutputPortSelectorBar from '~/components/output/OutputPortSelectorBar';

export default {
    components: {
        OutputPortSelectorBar,
        DataPortOutputTable
    },
    computed: {
        ...mapState('datatable', ['totalNumRows', 'totalNumColumns']),
        ...mapState('workflow', {
            nodes: state => state.activeWorkflow.nodes
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
        placeholderText() {
            switch (this.selectedNodes.length) {
            case 0:
                return 'Select a node to show its output data';
            case 1:
                return 'The selected node has no output port';
            default:
                return 'Select a single node to show its output data';
            }
        }
    }
};
</script>

<template>
  <div class="output-container">
    <template v-if="selectedNode && outPorts.length > 0">
      <OutputPortSelectorBar
        :node="selectedNode"
      />
      <span class="counts">
        <span class="count">Rows: {{ totalNumRows }}</span><!--
        --><span class="count">Columns: {{ totalNumColumns }}</span>
      </span>
      <DataPortOutputTable class="table" />
    </template>
    <div
      v-else
      class="placeholder"
    >
      {{ placeholderText }}
    </div>
  </div>
</template>

<style>
.output-container {
  padding: 10px;
  border-top: 1px solid var(--knime-silver-sand);
  position: relative;
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
}

.placeholder {
  text-align: center;
}
</style>
