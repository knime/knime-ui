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
  <table>
    <DataPortOutputTableHeader />
    <DataPortOutputTableBody />
  </table>
</template>

<style>
table {
  min-width: 100%;
}
</style>
