<script>
import { loadFlowVariables } from '~api';
/**
 * FlowVariable table container that contains a FlowVariablePortViewHeader and a FlowVariablePortViewBody
 */

export default {
    props: {
        projectId: { type: String, required: true },
        workflowId: { type: String, required: true },
        nodeId: { type: String, required: true },
        portIndex: { type: Number, required: true }
    },
    data: () => ({
        table: null
    }),
    async fetch() {
        this.$emit('update', { state: 'loading' });
        try {
            let { projectId, workflowId, nodeId, portIndex } = this;
            let table = await loadFlowVariables({ projectId, workflowId, nodeId, portIndex });

            this.table = table;

            // show table
            this.$emit('update', { state: 'ready' });
        } catch (e) {
            consola.error(e);
            this.$emit('update', { state: 'error', message: "Couldn't load flow variables" });
        }
    }
};
</script>

<template>
  <div class="scroll-container">
    <div
      v-if="table"
      class="counts"
    >
      <span class="count">Count: {{ table.length }}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th class="title">Owner ID</th>
          <th class="title">Data Type</th>
          <th class="title">Variable Name</th>
          <th class="title">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="flowVariable of table"
          :key="`flowVariable-${flowVariable.name}`"
        >
          <td>{{ flowVariable.ownerNodeId }}</td>
          <td>{{ flowVariable.type }}</td>
          <td>{{ flowVariable.name }}</td>
          <td>{{ flowVariable.value }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="postcss" scoped>
@import "./outputTable.css";
@import "./outputTableHeader.css";
@import "./outputTableBody.css";
</style>
