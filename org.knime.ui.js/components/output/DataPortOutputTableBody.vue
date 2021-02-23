<script>
import { mapState } from 'vuex';
import MissingValueIcon from '~/assets/missing-value.svg?inline';
import svgWithTitle from '~/webapps-common/ui/util/svgWithTitle';

export default {
    components: {
        MissingValueIcon: svgWithTitle(MissingValueIcon, 'Missing value')
    },
    computed: {
        ...mapState('dataTable', ['rows'])
    },
    methods: {
        hasValue(cell) {
            return Reflect.has(cell, 'valueAsString');
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
td {
  white-space: pre;
  max-width: 50vw;
  overflow: hidden;
  text-overflow: ellipsis;
  border: none;
  height: 26px;
  line-height: 26px;
  font-size: 14px;

  & svg {
    width: 16px;
    height: 16px;
    stroke-width: calc(32px / 16);
    vertical-align: -3px;
    margin-left: -1px;
  }
}

tr {
  content-visibility: auto;

  &:not(:last-child) {
    border-bottom: 1px solid var(--knime-porcelain);
  }
}
</style>
