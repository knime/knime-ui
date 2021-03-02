<script>
import { mapState, mapActions, mapGetters } from 'vuex';
import DataPortOutputTableHeader from '~/components/output/DataPortOutputTableHeader';
import DataPortOutputTableBody from '~/components/output/DataPortOutputTableBody';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';
import { throttle } from 'lodash';

const scrollHandlerThrottle = 500; // 500 ms between checking scroll positions
const tableVisibleDelay = 500; // table should be layouted and rendered after 500ms

/**
 * Data table container that contains a DataPortOutputTableHeader and a DataPortOutputTableBody
 */
export default {
    components: {
        DataPortOutputTableHeader,
        DataPortOutputTableBody,
        ReloadIcon
    },
    data: () => ({
        /**
         * Height of a single data row. They are assumed to all have the same height
         */
        dataRowHeight: null
    }),
    computed: {
        ...mapState('dataTable', ['isLoading', 'rows']),
        ...mapGetters('dataTable', ['canLoadMoreRows']),
        /**
         * if the table shows less than 200 elements,
         * lazy loading should be triggered when the 50th last element is in view
         *
         * for >= 200 elements,
         * lazy loading will be triggered when the 150th last element is in view
         * @returns {Number | NaN} scroll threshold from bottom in pixels
         */
        lazyLoadingScrollThreshold() {
            /* eslint-disable no-magic-numbers */
            if (this.rows?.length < 200) {
                return this.dataRowHeight * 50;
            } else {
                return this.dataRowHeight * 150;
            }
            /* eslint-enable no-magic-numbers */
        }
    },
    mounted() {
        setTimeout(() => {
            /* eslint-disable no-invalid-this */

            // [table-layout: auto] is used on the first data
            // for performance reasons this initial layout is fixed and not reevaluated for further rows
            this.fixLayout();

            // if the initial data fits inside the table without scrolling
            // more data is loaded once
            let canScroll = this.$refs.table.scrollHeight !== 0;
            if (this.canLoadMoreRows && !canScroll) {
                this.loadMoreRows();
            }
            /* eslint-enable no-invalid-this */
        }, tableVisibleDelay);

    },
    methods: {
        ...mapActions('dataTable', ['loadMoreRows']),
        fixLayout() {
            // measure
            let table = this.$el.querySelector('table');
            let tableWidth = table.getBoundingClientRect().width;

            let firstCells = [...this.$el.querySelectorAll('thead tr th')];
            let columnWidths = firstCells.map(cell => cell.getBoundingClientRect().width);

            let dataRow = this.$el.querySelector('tbody tr');
            this.dataRowHeight = dataRow.getBoundingClientRect().height;

            // update
            table.style.tableLayout = 'fixed';
            firstCells.forEach((cell, index) => {
                cell.style.width = `${columnWidths[index]}px`;
            });
            table.style.width = `${tableWidth}px`;

            consola.trace('table layout fixed');
        },
        onScroll: throttle(function () {
            /* eslint-disable no-invalid-this */
            if (!this.canLoadMoreRows || this.isLoading) { return; }

            let hiddenHeight = Math.round(
                this.$refs.table.getBoundingClientRect().height -
                this.$el.getBoundingClientRect().height
            );

            let scrollDistanceBottom = hiddenHeight - this.$el.scrollTop;

            consola.verbose(`scrolling: current ${scrollDistanceBottom}, threshold ${this.lazyLoadingScrollThreshold}`);

            if (scrollDistanceBottom <= this.lazyLoadingScrollThreshold) {
                consola.trace('scrolled below threshold');
                this.loadMoreRows();
            }
            /* eslint-enable no-invalid-this */
        }, scrollHandlerThrottle)
    }
};
</script>

<template>
  <div
    class="scroll-container"
    @scroll="onScroll"
  >
    <table ref="table">
      <DataPortOutputTableHeader />
      <DataPortOutputTableBody />
      <tfoot v-if="isLoading">
        <tr>
          <td>
            <ReloadIcon />
          </td>
          <td colspan="5">
            Loading ...
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style lang="postcss" scoped>
@import "./outputTable.css";

@keyframes spin {
  100% {
    transform: rotate(-360deg);
  }
}

table {
  & tfoot {
    font-size: 14px;
    font-style: italic;
    background: var(--knime-porcelain);
    height: 35px;
    bottom: 0;

    & td:nth-child(1) {
      text-align: center;

      & >>> svg {
        animation: spin 2s linear infinite;
        width: 24px;
        height: 24px;
        stroke-width: calc(32px / 24);
        margin: auto;
        stroke: var(--knime-masala);
        vertical-align: -6px;
        margin-right: 10px;
      }
    }
  }
}
</style>
