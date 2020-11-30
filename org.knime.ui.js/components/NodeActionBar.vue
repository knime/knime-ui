<script>
import executeIcon from '../assets/execute.svg?inline';
import resetIcon from '../assets/reset-all.svg?inline';
import cancelIcon from '../assets/cancel-execution.svg?inline';

import ActionButton from '~/components/ActionButton.vue';

/** Displays a bar of action buttons above nodes */
export default {
    components: {
        ActionButton,

        // [action]Icon
        executeIcon,
        cancelIcon,
        resetIcon
    },
    props: {
        /**
         * { canCancel: Boolean, canExecute: Boolean, canReset: Boolean }
         * Provided by Backend
         */
        allowedActions: {
            type: Object,
            default: () => {}
        }
    },
    computed: {
        actions() {
            return Object.fromEntries(
                // e.g. turn 'canExecute' into 'execute'
                // eslint-disable-next-line no-magic-numbers
                Object.entries(this.allowedActions).map(([key, value]) => [key.slice(3).toLowerCase(), value])
            );
        },
        /**
         *  returns the x-position of each button depending on the total amount of buttons
         *  assumes 0-3 buttons
         *  @returns {Number} x-pos
         */
        positions() {
            switch (Object.keys(this.actions).length) {
            /* eslint-disable no-magic-numbers */
            case 1: return [0];
            case 2: return [-12.5, 12.5];
            default: return [-25, 0, 25];
            /* eslint-enable no-magic-numbers */
            }
        }
    }
  
};
</script>

<template>
  <g>
    <ActionButton
      v-for="(enabled, action, index) in actions"
      :key="action"
      :x="positions[index]"
      :disabled="!enabled"
      @click="$emit('action', action)"
    >
      <Component :is="`${action}Icon`" />
    </ActionButton>
  </g>
</template>
