<script>
/**
 * Data table header that renders the column names and types of a dataTable
 * into the header of a table
 */
export default {
    props: {
        cellTypes: { type: Object, required: true },
        columns: { type: Array, required: true }
    },
    methods: {
        formatType({ typeRef }) {
            return this.cellTypes[typeRef]?.name || '';
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
        >ID</span>
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
@import "./outputTableHeader.css";

.type {
  font-weight: 400;
  font-size: 10px;
  line-height: 12px;
  font-style: italic;
}
</style>
