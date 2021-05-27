<script>
import Header from './TablePortViewHeader';
import Body from './TablePortViewBody';
import ReloadIcon from '~/webapps-common/ui/assets/img/icons/reload.svg?inline';
import { throttle } from 'lodash';
import { loadTable } from '~api';

const scrollHandlerThrottle = 500; // 500 ms between checking scroll positions
const tableVisibleDelay = 500; // table should be layouted and rendered after 500ms
/**
 * Data table container that contains a Header, a Body and a footer
 */
export default {
    components: {
        Header,
        Body,
        ReloadIcon
    },
    props: {
        projectId: { type: String, required: true },
        nodeId: { type: String, required: true },
        workflowId: { type: String, required: true },
        portIndex: { type: Number, required: true }
    },
    data: () => ({
        /**
         * Height of a single data row. They are assumed to all have the same height
         */
        dataRowHeight: null,
        table: null,
        isLazyLoading: false
    }),
    async fetch() {
        this.$emit('update', { state: 'loading' });
        try {
            const firstRows = 100; // batch size for initial load
            let { projectId, workflowId, nodeId, portIndex } = this;
            let table = await loadTable({ projectId, workflowId, nodeId, portIndex, batchSize: firstRows });
            
            // number of rows unknown. Easier for comparison
            if (table.totalNumRows === -1) { table.totalNumRows = Infinity; }
            
            // make this table-object (not it's contained objects) read-only to stop vue from observing the table
            // vue still reacts on exchanging tables
            // Object.freeze(table);
            this.table = table;
            
            // show table
            this.$emit('update', { state: 'ready' });
        } catch (e) {
            consola.error(e);
            this.$emit('update', { state: 'error', message: "Couldn't load table" });
        }
    },
    computed: {
        canLoadMoreRows() {
            const { table } = this;
            return table && table.totalNumRows > table.rows?.length;
        },
        /**
         * if the table shows less than lazyLoadSmallLargeThreshold (200) elements,
         * lazy loading should be triggered when the lazyLoadTriggerRowSmall-th (50th) last element is in view
         *
         * for >= lazyLoadSmallLargeThreshold (200) elements,
         * lazy loading will be triggered when the lazyLoadTriggerRowLarge-th (150th) last element is in view
         * @returns {Number | NaN} scroll threshold from bottom in pixels
         */
        lazyLoadingScrollThreshold() {
            const lazyLoadTriggerRowSmall = 50; // if the table is 'small', load more rows after reaching 50 rows from the bottom
            const lazyLoadTriggerRowLarge = 150; // if the table is 'large', load more rows after reaching 150 rows from the bottom
            const lazyLoadSmallLargeThreshold = 200; // if the table has strictly less rows than threshold, use small trigger else large trigger
            
            if (this.table.rows?.length < lazyLoadSmallLargeThreshold) {
                return this.dataRowHeight * lazyLoadTriggerRowSmall;
            } else {
                return this.dataRowHeight * lazyLoadTriggerRowLarge;
            }
        }
    },
    watch: {
        table(newTable, oldTable) {
            if (!oldTable && newTable) {
                setTimeout(() => {
                    // [table-layout: auto] is used on the first data
                    // for performance reasons this initial layout is fixed and not reevaluated for further rows
                    this.fixLayout();

                    // if the initial data fits inside the table without scrolling
                    // more data is loaded once
                    let canScroll = this.$refs.table.scrollHeight !== 0;
                    if (this.canLoadMoreRows && !canScroll) {
                        this.loadMoreRows();
                    }
                }, tableVisibleDelay);
            }
        }
    },
    methods: {
        /*
         * Measures the width of the header cells that have been set by the browser's layouting algorithm.
         * Sets the layout permanently and disables the browser's layouting algorithm
         */
        fixLayout() {
            // measure
            let table = this.$refs.table;
            let tableWidth = table.getBoundingClientRect().width;

            let firstCells = [...table.querySelectorAll('thead tr th')];
            let columnWidths = firstCells.map(cell => cell.getBoundingClientRect().width);

            let dataRow = table.querySelector('tbody tr');
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
            if (!this.canLoadMoreRows || this.isLazyLoading) { return; }

            let { table, scroller } = this.$refs;

            let hiddenHeight =
                table.getBoundingClientRect().height -
                scroller.getBoundingClientRect().height;

            let scrollDistanceBottom = hiddenHeight - scroller.scrollTop;

            consola.verbose(
                `scrolling: current ${Math.round(scrollDistanceBottom)}, threshold ${this.lazyLoadingScrollThreshold}`
            );

            if (scrollDistanceBottom <= this.lazyLoadingScrollThreshold) {
                consola.trace('scrolled below threshold');
                this.loadMoreRows();
            }
        }, scrollHandlerThrottle),
        async loadMoreRows() {
            const moreRows = 450; // batch size for lazy loading

            consola.trace('loading more table rows');
            this.isLazyLoading = true;
            await this.$nextTick();

            // load more rows
            let { projectId, workflowId, nodeId, portIndex } = this;
            try {
                let table = await loadTable({
                    projectId,
                    workflowId,
                    nodeId,
                    portIndex,
                    offset: this.table.rows.length,
                    batchSize: moreRows
                });
                if (!table?.rows) {
                    throw new Error('Loaded table contains no rows');
                }

                this.table.rows.push(...table.rows);
                consola.trace('more table rows pushed');
            } finally {
                // indicate loading finished
                this.isLazyLoading = false;
            }
        }
    }
};
</script>

<template>
  <div style="display: contents;">
    <div
      v-if="table"
      class="counts"
    >
      <span>Rows: {{ table.rows.length }}</span>
      <span v-if="canLoadMoreRows"> of {{ table.totalNumRows }}</span>
      <span>Columns: {{ table.spec.totalNumColumns }}</span>
    </div>
    <div
      v-if="table"
      ref="scroller"
      class="scroller"
      @scroll="onScroll"
    >
      <table ref="table">
        <Header
          :cell-types="table.spec.cellTypes"
          :columns="table.spec.columns"
        />
        <Body :rows="table.rows" />
        <tfoot v-if="isLazyLoading">
          <tr>
            <td>
              <ReloadIcon />
            </td>
            <td colspan="5">
              Loading…
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
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
