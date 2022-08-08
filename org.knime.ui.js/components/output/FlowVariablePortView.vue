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
.scroller {
  width: 100%;
  overflow: auto;
}

.counts {
  margin-bottom: 20px;
  height: 19px;
  line-height: 19px;
  font-size: 14px;

  & .count {
    &:not(:first-child) {
      padding-left: 8px;
    }

    &:not(:last-child) {
      padding-right: 8px;
      border-right: 1px solid var(--knime-silver-sand);
    }
  }
}

table {
  min-width: 100%;
  border-collapse: collapse;
  font-family: "Roboto Condensed", sans-serif;
  contain: strict;

  & >>> th,
  & >>> td {
    padding: 0 6px;
    text-align: left;
    max-width: 1000px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  & >>> th {
    background: var(--knime-porcelain);
    height: 42px;
    position: sticky;
    top: 0;

    &:not(:last-child) {
      /* border-right: 1px solid var(--knime-white); does not work with position: sticky */
      &::after {
        content: "";
        display: block;
        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;
        width: 1px;
        background: var(--knime-white);
      }
    }
  }

  & >>> td {
    white-space: pre;
    max-width: 50vw;
    overflow: hidden;
    text-overflow: ellipsis;
    border: none;
    height: 26px;
    line-height: 26px;
    font-size: 14px;
  }

  & >>> tr:not(:last-child) {
    border-bottom: 1px solid var(--knime-porcelain);
  }
}

span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: block;
  max-width: 100%;
}

.title {
  font-weight: 700;
  font-size: 14px;
  line-height: 16px;
}
</style>
