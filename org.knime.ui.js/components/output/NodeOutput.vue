<script>
import DataPortOutputTable from '~/components/output/DataPortOutputTable';

export default {
    components: { DataPortOutputTable }
};
</script>

<template>
  <div class="output-container">
    <DataPortOutputTable />
  </div>
</template>

<style>
.output-container {
  padding: 20px 20px 0;
  border-top: 1px solid var(--knime-silver-sand);
}
</style>
