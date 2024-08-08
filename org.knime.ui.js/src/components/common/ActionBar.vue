<script>
import SaveIcon from "@/assets/ok.svg";
import CancelIcon from "@/assets/cancel.svg";
import ActionButton from "@/components/common/ActionButton.vue";

/**
 * ActionBar that is displayed when the NodeNameEditor is in edit state.
 * Shows a save and a cancel button
 * Emits 'save' and 'cancel' events
 */
export default {
  components: {
    SaveIcon,
    CancelIcon,
    ActionButton,
  },

  props: {
    actions: {
      type: Array,
      required: true,
    },

    preventContextMenu: {
      type: Boolean,
      default: false,
    },
  },

  computed: {
    /**
     *  returns the x-position of each button depending on the total amount of buttons
     *  @returns {Array<Number>} x-pos
     */
    positions() {
      const { nodeActionBarButtonSpread } = this.$shapes;
      let buttonCount = this.actions.length;
      // spread buttons evenly around the horizontal center
      return this.actions.map(
        (_, i) => (i + (1 - buttonCount) / 2) * nodeActionBarButtonSpread,
      );
    },
  },

  methods: {
    getTitle(action) {
      const { title } = action;
      if (!title) {
        return null;
      }

      if (typeof title === "string") {
        return title;
      }

      if (typeof title === "function") {
        return title(action);
      }

      return null;
    },
    onContextMenu(e) {
      if (this.preventContextMenu) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
  },
};
</script>

<template>
  <g>
    <ActionButton
      v-for="(action, index) in actions"
      :key="index"
      :x="positions[index]"
      :primary="action.primary"
      :disabled="action.disabled"
      :title="getTitle(action)"
      @click="action.onClick"
    >
      <Component :is="action.icon" />
    </ActionButton>
  </g>
</template>
