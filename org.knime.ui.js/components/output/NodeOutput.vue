<script>
import { mapState } from 'vuex';
import DataPortOutputTable from '~/components/output/DataPortOutputTable';

export default {
    components: {
        DataPortOutputTable
    },
    computed: {
        ...mapState('datatable', ['totalNumRows', 'totalNumColumns', 'nodes']),
    }
};
</script>

<template>
  <div class="output-container">
    <span class="counts">
      <span class="count">Rows: {{ totalNumRows }}</span><!--
      --><span class="count">Columns: {{ totalNumColumns }}</span>
    </span>
    <DataPortOutputTable class="table" />
  </div>
</template>

<style>
.output-container {
  padding: 10px;
  border-top: 1px solid var(--knime-silver-sand);
  position: relative;
}

.counts {
  position: absolute;
  right: 10px;
  height: 19px;
  line-height: 19px;
  top: 16px;
  font-size: 14px;
}

.count {
  padding-left: 8px;

  &:not(:last-child) {
    padding-right: 8px;
    border-right: 1px solid var(--knime-silver-sand);
  }
}

.table {
  margin-top: 45px;
}
</style>
