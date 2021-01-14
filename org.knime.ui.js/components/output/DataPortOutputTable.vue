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
.scroll-container {
  width: 100%;
  overflow: auto;
}

table {
  min-width: 100%;
  border-collapse: collapse;
  font-family: "Roboto Condensed", sans-serif;

  & >>> th,
  & >>> td {
    padding: 0 6px;
    text-align: left;
    max-width: 1000px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

</style>
