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
  border-top: 1px solid var(--knime-black);
  white-space: pre;
  max-width: 50vw;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
