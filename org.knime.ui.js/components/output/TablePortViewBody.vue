<script>
import MissingValueIcon from '~knime-ui/assets/missing-value.svg?inline';
import svgWithTitle from '~webapps-common/ui/util/svgWithTitle';

/**
 * Data table body that renders the content of
 * a dataTable into a table body
 */
export default {
    components: {
        MissingValueIcon: svgWithTitle(MissingValueIcon, 'Missing value')
    },
    props: {
        rows: { type: Array, required: true }
    },
    methods: {
        hasValue(cell) {
            return 'valueAsString' in cell;
        }
    }
};
</script>

<template>
  <tbody>
    <tr
      v-for="(row, rowIndex) of rows"
      :key="`row-${rowIndex}`"
    >
      <td>
        <template v-if="row.id">
          {{ row.id }}
        </template>
        <MissingValueIcon v-else />
      </td>
      <td
        v-for="(cell, cellIndex) of row.cells"
        :key="`cell-${rowIndex}-${cellIndex}`"
      >
        <template v-if="hasValue(cell)">
          {{ cell.valueAsString }}
        </template>
        <MissingValueIcon v-else />
      </td>
    </tr>
  </tbody>
</template>

<style lang="postcss" scoped>
@import "./outputTableBody.css";

td svg {
  width: 16px;
  height: 16px;
  stroke-width: calc(32px / 16);
  vertical-align: -3px;
  margin-left: -1px;
}
</style>
