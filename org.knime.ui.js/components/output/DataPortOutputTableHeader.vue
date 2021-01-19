<script>
import { mapState } from 'vuex';

export default {
    computed: {
        ...mapState('dataTable', ['columns', 'cellTypes'])
    },
    methods: {
        formatType({ typeRef }) {
            if (!Reflect.has(this.cellTypes, typeRef)) {
                return '';
            }
            return this.cellTypes[typeRef].name;
        }
    }
};
</script>

<template>
  <thead>
    <tr>
      <th>
        <span
          class="title"
          title="Row ID"
        >{{ 'ID' }}</span>
      </th>
      <th
        v-for="(column, index) of columns"
        :key="`table-header-${index}`"
      >
        <span
          class="title"
          :title="column.name"
        >{{ column.name }}</span>
        <span class="type">{{ formatType(column) }}</span>
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

.type {
  font-weight: 400;
  font-size: 10px;
  line-height: 12px;
  font-style: italic;
}

</style>
