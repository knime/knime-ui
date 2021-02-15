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
@import "./outputTable.css";
</style>
