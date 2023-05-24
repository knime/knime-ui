<script>
import { escapeStack } from "@/mixins";

import DeleteIcon from "@/assets/delete.svg";
import ActionButton from "@/components/common/ActionButton.vue";
import Port from "@/components/common/Port.vue";

export const portActionButtonSize = 20;
const portActionsGapSize = 5;

export default {
  components: {
    Port,
    ActionButton,
    DeleteIcon,
  },
  mixins: [
    escapeStack({
      onEscape() {
        this.$emit("close");
      },
    }),
  ],
  props: {
    port: {
      type: Object,
      required: true,
    },
    direction: {
      type: String,
      required: true,
      validator: (t) => ["in", "out"].includes(t),
    },
    relativePosition: {
      type: Array,
      default: () => [0, 0],
      validator: (pos) => Array.isArray(pos) && pos.length === 2,
    },
    anchorPoint: {
      type: Object,
      required: true,
      validator: (value) =>
        typeof value.x === "number" && typeof value.y === "number",
    },
  },
  emits: ["close", "action:remove"],
  computed: {
    actions() {
      return [
        {
          id: "remove",
          title: "Remove port",
          isDisabled: !this.port.canRemove,
          eventName: "action:remove",
        },
      ];
    },
    selectedPortPosition() {
      const [x, y] = this.relativePosition;
      return [this.anchorPoint.x + x, this.anchorPoint.y + y];
    },
    hoverArea() {
      const totalActions = this.actions.length;

      // reverse the rect
      const xOffset =
        this.direction === "in" ? portActionButtonSize * totalActions : 0;

      return {
        x: -(portActionButtonSize / 2) - xOffset,
        y: -(portActionButtonSize / 2),

        // calculates the hover area based on the total actions
        // adds 1 to account for the space the highlighted port itself takes up
        width: portActionButtonSize * (totalActions + 1),
        height: portActionButtonSize,
      };
    },
  },
  methods: {
    buttonX(actionIndex) {
      const delta = this.direction === "in" ? -1 : 1;
      return (portActionButtonSize + portActionsGapSize) * actionIndex * delta;
    },
  },
};
</script>

<template>
  <g :transform="`translate(${selectedPortPosition})`">
    <!--
        Capture mouse events on the rect to prevent them from being sent to the node
        while the port actions are visible
     -->
    <rect
      v-bind="hoverArea"
      fill="transparent"
      @mouseenter.stop
      @mouseleave.stop
      @click.stop
    />

    <!-- 'fake' selected port -->
    <Port :port="port" class="selected-port" is-selected />

    <ActionButton
      v-for="(action, index) in actions"
      :id="action.id"
      :key="action.id"
      :x="buttonX(index + 1)"
      :disabled="action.isDisabled"
      :title="action.title"
      @click="$emit(action.eventName)"
    >
      <DeleteIcon />
    </ActionButton>
  </g>
</template>
