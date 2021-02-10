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
th {
  background: var(--knime-porcelain);
  height: 42px;
  position: sticky;
  top: 0;

  &:not(:last-child) {
    /* border-right: 1px solid var(--knime-white); does not work with position: sticky */
    &::after {
      content: '';
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
