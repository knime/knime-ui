<script>
import SaveIcon from '~/assets/ok.svg?inline';
import CancelIcon from '~/assets/cancel.svg?inline';
import ActionButton from '~/components/workflow/ActionButton';

/**
 * Editor Action Bar
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
                ['save', SaveIcon, this.saveChange],
                ['cancel', CancelIcon, this.closeEditor]
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
    },
    methods: {
        closeEditor(e) {
            this.$emit('close');
        },
        saveChange(e) {
            this.$emit('save', this.editorText);
        }
    }
};
</script>

<template>
  <g>
    <ActionButton
      v-for="([action, icon, method], index) in actions"
      :key="action"
      :class="`action-${action}`"
      :x="positions[index]"
      @click="method"
    >
      <Component :is="icon" />
    </ActionButton>
  </g>
</template>

<style scoped>

</style>
