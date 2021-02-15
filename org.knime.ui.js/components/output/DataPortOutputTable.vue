<script>
import DataPortOutputTableHeader from '~/components/output/DataPortOutputTableHeader';
import DataPortOutputTableBody from '~/components/output/DataPortOutputTableBody';

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
