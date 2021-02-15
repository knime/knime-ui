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
        {{ flowVariable[column] }}
      </td>
    </tr>
  </tbody>
</template>

<style lang="postcss" scoped>
@import "./outputTableBody.css";
</style>
