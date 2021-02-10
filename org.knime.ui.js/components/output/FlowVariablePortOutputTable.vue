<script>
import FlowVariablePortOutputTableHeader from '~/components/output/FlowVariablePortOutputTableHeader';
import FlowVariablePortOutputTableBody from '~/components/output/FlowVariablePortOutputTableBody';

/**
 * FlowVariable table container that contains a FlowVariablePortOutputTableHeader and a FlowVariablePortOutputTableBody
 */

export default {
    components: {
        FlowVariablePortOutputTableHeader,
        FlowVariablePortOutputTableBody
    }
};
</script>

<template>
  <div class="scroll-container">
    <table>
      <FlowVariablePortOutputTableHeader />
      <FlowVariablePortOutputTableBody />
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
