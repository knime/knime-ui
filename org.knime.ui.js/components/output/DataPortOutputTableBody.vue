<script>
import { mapState } from 'vuex';

export default {
    computed: {
        ...mapState('datatable', ['rows'])
    }
};
</script>

<template>
  <tbody>
    <tr
      v-for="(row, rowIndex) of rows"
      :key="`row-${rowIndex}`"
    >
      <td
        v-for="(cell, cellIndex) of row.cells"
        :key="`cell-${rowIndex}-${cellIndex}`"
      >
        {{ cell.valueAsString }}
      </td>
    </tr>
  </tbody>
</template>

<style>
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
