<script>
import { mapState } from 'vuex';

/**
 * FlowVariable table header that renders the four properties: Owner, Data Type, Variable Name, Value
 * into the header of the table
 */
export default {
    computed: {
        ...mapState('flowVariables', ['flowVariables']),
        // Array that contains all available column headers
        columns() {
            return ['Owner ID', 'Data Type', 'Variable Name', 'Value'];
        }
    }
};
</script>

<template>
  <thead>
    <tr>
      <th
        v-for="column in columns"
        :key="column"
      >
        <span
          class="title"
          :title="column"
        >{{ column }}</span>
      </th>
    </tr>
  </thead>
</template>

<style lang="postcss" scoped>
@import "./outputTableHeader.css";
</style>
