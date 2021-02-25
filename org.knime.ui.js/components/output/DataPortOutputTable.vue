<script>
import DataPortOutputTableHeader from '~/components/output/DataPortOutputTableHeader';
import DataPortOutputTableBody from '~/components/output/DataPortOutputTableBody';

/**
 * Data table container that contains a DataPortOutputTableHeader and a DataPortOutputTableBody
 */
export default {
    components: {
        DataPortOutputTableHeader,
        DataPortOutputTableBody
    }
};
</script>

<template>
  <div class="scroll-container">
    <table>
      <DataPortOutputTableHeader />
      <DataPortOutputTableBody />
    </table>
  </div>
</template>

<style lang="postcss" scoped>
@import "./outputTable.css";
</style>
