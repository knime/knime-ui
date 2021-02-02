<script>
import ExecuteIcon from '../assets/execute.svg?inline';
import ResetIcon from '../assets/reset-all.svg?inline';
import CancelIcon from '../assets/cancel-execution.svg?inline';
import OpenViewIcon from '../assets/open-view.svg?inline';
import OpenDialogIcon from '../assets/configure-node.svg?inline';

import ActionButton from '~/components/ActionButton.vue';

/**
 *  Displays a bar of action buttons above nodes
 *  Emits Event `action(actionName)`
 */
export default {
    components: {
        ActionButton
    },
    props: {
        nodeId: {
            type: String,
            default: 'NODE ID MISSING'
        },
        canExecute: {
            type: Boolean,
            default: false
        },
        canCancel: {
            type: Boolean,
            default: false
        },
        canReset: {
            type: Boolean,
            default: false
        },
        canOpenView: {
            type: Boolean,
            default: null
        },
        canOpenDialog: {
            type: Boolean,
            default: null
        }
    },
    computed: {
        /**
         *  returns an array of allowed actions with the corresponding api call,
         *  a boolean if it is enabled or disabled and an icon. openDialog and openView are only added when the prop is available
         *  @returns {Array<Array>} Array of allowed actions
         */
        actions() {
            return [
                ...this.canOpenDialog === null ? [] : [['openDialog', this.canOpenDialog, OpenDialogIcon]],
                ['executeNodes', this.canExecute, ExecuteIcon],
                ['cancelNodeExecution', this.canCancel, CancelIcon],
                ['resetNodes', this.canReset, ResetIcon],
                ...this.canOpenView === null ? [] : [['openView', this.canOpenView, OpenViewIcon]]
            ];
        },
        /**
         *  returns the x-position of each button depending on the total amount of buttons
         *  @returns {Array<Number>} x-pos
         */
        positions() {
            const { nodeActionBarButtonSpread } = this.$shapes;
            return [...this.canOpenDialog === null ? [] : [-nodeActionBarButtonSpread * 2],
                -nodeActionBarButtonSpread,
                0,
                nodeActionBarButtonSpread,
                ...this.canOpenView === null ? [] : [nodeActionBarButtonSpread * 2]];
        }
    }
};
</script>

<template>
  <g>
    <ActionButton
      v-for="([action, enabled, icon], index) in actions"
      :key="action"
      :x="positions[index]"
      :disabled="!enabled"
      @click="$emit('action', action)"
    >
      <Component :is="icon" />
    </ActionButton>
    
    <text
      class="node-id"
      text-anchor="middle"
      :y="-$shapes.nodeIdMargin"
    >
      {{ nodeId }}
    </text>
  </g>
</template>

<style scoped>
.node-id {
  font: normal 10px "Roboto Condensed", sans-serif;
  pointer-events: none;
}
</style>
