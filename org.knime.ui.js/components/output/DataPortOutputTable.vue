<script>
import { mapState, mapActions, mapGetters } from 'vuex';
import DataPortOutputTableHeader from '~/components/output/DataPortOutputTableHeader';
import DataPortOutputTableBody from '~/components/output/DataPortOutputTableBody';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';
import { throttle } from 'lodash';

const scrollHandlerThrottle = 500; // 500 ms between checking scroll positions
const tableVisibleDelay = 500; // table should be layouted and rendered after 500ms
const lazyLoadTriggerRowSmall = 50; // if the table is 'small', load more rows after reaching 50 rows from the bottom
const lazyLoadTriggerRowLarge = 150; // if the table is 'small', load more rows after reaching 50 rows from the bottom
const lazyLoadSmallLargeThreshold = 200; // if the table has strictly less rows than threshold, use small trigger else large trigger
/**
 * Data table container that contains a DataPortOutputTableHeader, a DataPortOutputTableBody and a footer
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
         * if the table shows less than lazyLoadSmallLargeThreshold (200) elements,
         * lazy loading should be triggered when the lazyLoadTriggerRowSmall-th (50th) last element is in view
         *
         * for >= lazyLoadSmallLargeThreshold (200) elements,
         * lazy loading will be triggered when the lazyLoadTriggerRowLarge-th (150th) last element is in view
         * @returns {Number | NaN} scroll threshold from bottom in pixels
         */
        lazyLoadingScrollThreshold() {
            if (this.rows?.length < lazyLoadSmallLargeThreshold) {
                return this.dataRowHeight * lazyLoadTriggerRowSmall;
            } else {
                return this.dataRowHeight * lazyLoadTriggerRowLarge;
            }
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
            let canScroll = this.$refs.table?.scrollHeight !== 0;
            if (this.canLoadMoreRows && !canScroll) {
                this.loadMoreRows();
            }
            /* eslint-enable no-invalid-this */
        }, tableVisibleDelay);

    },
    methods: {
        ...mapActions('dataTable', ['loadMoreRows']),
        /*
         * Measures the width of the header cells that have been set by the browser's layouting algorithm.
         * Sets the layout permanently and disables the browser's layouting algorithm
         */
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

            let hiddenHeight =
                this.$refs.table.getBoundingClientRect().height -
                this.$el.getBoundingClientRect().height;

            let scrollDistanceBottom = hiddenHeight - this.$el.scrollTop;

            consola.verbose(
                `scrolling: current ${Math.round(scrollDistanceBottom)}, threshold ${this.lazyLoadingScrollThreshold}`
            );

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
