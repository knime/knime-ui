<script>
import SaveIcon from '~/assets/ok.svg?inline';
import CancelIcon from '~/assets/cancel.svg?inline';
import ActionButton from '~/components/workflow/ActionButton';

/**
 * ActionBar that is displayed when the NodeNameEditor is in edit state.
 * Shows a save and a cancel button
 * Emits 'save' and 'cancel' events
 */
export default {
    components: {
        SaveIcon,
        CancelIcon,
        ActionButton
    },
    computed: {
        actions() {
            return [
                // event, icon, primaryStyle
                ['save', SaveIcon, true],
                ['cancel', CancelIcon, false]
            ];
        },
        /**
         *  returns the x-position of each button depending on the total amount of buttons
         *  @returns {Array<Number>} x-pos
         */
        positions() {
            const { nodeActionBarButtonSpread } = this.$shapes;
            let buttonCount = this.actions.length;
            // spread buttons evenly around the horizontal center
            return this.actions.map((_, i) => (i + (1 - buttonCount) / 2) * nodeActionBarButtonSpread);
        }
    }
};
</script>

<template>
  <g @contextmenu.stop.prevent>
    <ActionButton
      v-for="([event, icon, primary], index) in actions"
      :key="event"
      :x="positions[index]"
      :primary="primary"
      @click="$emit(event)"
    >
      <Component :is="icon" />
    </ActionButton>
  </g>
</template>
