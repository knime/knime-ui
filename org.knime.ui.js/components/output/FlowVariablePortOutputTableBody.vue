<script>
import { mapState } from 'vuex';

/**
 * FlowVariable table body that renders the owner, type, name and value property of
 * flowVariables into a table body
 */
export default {
    computed: {
        ...mapState('flowVariables', ['flowVariables']),
        // Array that contains all available property names
        columns() {
            return ['ownerNodeId', 'type', 'name', 'value'];
        }
    }
};
</script>

<template>
  <tbody>
    <tr
      v-for="(flowVariable) of flowVariables"
      :key="`flowVariable-${flowVariable.name}`"
    >
      <td
        v-for="column in columns"
        :key="column"
      >
        <template v-if="flowVariable[column]">
          {{ flowVariable[column] }}
        </template>
      </td>
    </tr>
  </tbody>
</template>

<style lang="postcss" scoped>
td {
  white-space: pre;
  max-width: 50vw;
  overflow: hidden;
  text-overflow: ellipsis;
  border: none;
  height: 26px;
  line-height: 26px;
  font-size: 14px;
}

tr:not(:last-child) {
  border-bottom: 1px solid var(--knime-porcelain);
}
</style>
