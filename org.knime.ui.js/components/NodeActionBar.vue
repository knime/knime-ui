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
        nodeView: {
            type: Object,
            default: null
        },
        nodeDialog: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        actions() {
            return [
                ...this.nodeDialog ? [['openDialog', this.nodeDialog, OpenDialogIcon]] : [],
                ['executeNodes', this.canExecute, ExecuteIcon],
                ['cancelNodeExecution', this.canCancel, CancelIcon],
                ['resetNodes', this.canReset, ResetIcon],
                ...this.nodeView ? [['openView', this.nodeView?.available, OpenViewIcon]] : []
            ];
        },
        /**
         *  returns the x-position of each button depending on the total amount of buttons
         *  @returns {Array<Number>} x-pos
         */
        positions() {
            const { nodeActionBarButtonSpread } = this.$shapes;
            return [...this.nodeDialog ? [-nodeActionBarButtonSpread * 2] : [],
                -nodeActionBarButtonSpread,
                0,
                nodeActionBarButtonSpread,
                ...this.nodeView ? [nodeActionBarButtonSpread * 2] : []];
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
