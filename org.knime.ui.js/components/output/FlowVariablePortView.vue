<script>
/**
 * FlowVariable table container that contains a FlowVariablePortViewHeader and a FlowVariablePortViewBody
 */

export default {
    props: {
        projectId: { type: String, required: true },
        workflowId: { type: String, required: true },
        nodeId: { type: String, required: true },
        portIndex: { type: Number, required: true },
        initialData: { type: Array, required: true }
    }
};
</script>

<template>
  <div class="scroll-container">
    <div
      v-if="initialData"
      class="counts"
    >
      <span class="count">Count: {{ initialData.length }}</span>
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
          v-for="flowVariable of initialData"
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
