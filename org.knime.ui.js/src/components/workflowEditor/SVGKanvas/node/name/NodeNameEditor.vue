<script lang="ts">
import { type PropType, defineComponent } from "vue";
import { mapState } from "pinia";

import type { XY } from "@/api/gateway-api/generated-api";
import CancelIcon from "@/assets/cancel.svg";
import SaveIcon from "@/assets/ok.svg";
import ActionBar from "@/components/workflowEditor/SVGKanvas/common/ActionBar.vue";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";

import NodeNameTextarea from "./NodeNameTextarea.vue";

const invalidCharsErrorVisibleTime = 4000; // ms

type ComponentData = {
  hideInvalidCharsTimeoutId: number | null;
  currentName: string;
  latestDimensions: {
    width: number | null;
    height: number | null;
  };
};

/**
 * Node Name Editor. Component wraps inline textarea and editor action bar (cancel, save). It overlays the whole
 * canvas (via the portal) with a rect that avoids changes to the canvas.
 */
export default defineComponent({
  components: {
    ActionBar,
    NodeNameTextarea,
  },
  props: {
    value: {
      type: String,
      default: "",
    },
    nodeId: {
      type: String,
      required: true,
    },
    nodePosition: {
      type: Object as PropType<XY>,
      required: true,
      validator: (position: XY) =>
        typeof position.x === "number" && typeof position.y === "number",
    },
    /* start width to initialize the editor with */
    startWidth: {
      type: Number,
      default: null,
    },
    /* start height to initialize the editor with */
    startHeight: {
      type: Number,
      default: null,
    },
  },
  emits: ["save", "cancel", "widthChange", "heightChange"],
  data(): ComponentData {
    return {
      hideInvalidCharsTimeoutId: null,
      currentName: this.value,
      latestDimensions: {
        width: null,
        height: null,
      },
    };
  },
  computed: {
    ...mapState(useSVGCanvasStore, ["viewBox"]),
    overlayStyles() {
      const { left, top } = this.viewBox;
      return {
        width: "100%",
        height: "100%",
        x: left,
        y: top,
      };
    },
    invalidCharacters() {
      return /[*?#:"<>%~|/\\]/g;
    },

    actions() {
      return [
        {
          name: "save",
          icon: SaveIcon,
          onClick: this.onSave,
          primary: true,
        },
        {
          name: "cancel",
          icon: CancelIcon,
          onClick: this.onCancel,
        },
      ];
    },

    actionBarPosition() {
      return [
        this.nodePosition.x + this.$shapes.nodeSize / 2,
        this.nodePosition.y -
          this.$shapes.nodeSelectionPadding[0] -
          (this.latestDimensions.height ?? 0),
      ];
    },

    errorMessagePosition() {
      const halfNodeSize = this.$shapes.nodeSize / 2;
      // use node with padding as minimum
      const currentWidthWithMinimum = Math.max(
        this.latestDimensions.width ?? 0,
        this.$shapes.nodeWidthWithPadding,
      );
      return {
        x: this.nodePosition.x + halfNodeSize - currentWidthWithMinimum / 2,
        y: this.nodePosition.y,
      };
    },
  },
  watch: {
    value(newValue) {
      this.currentName = newValue;
    },
  },
  methods: {
    handleDimensionChange(
      dimensionName: "width" | "height",
      dimensionValue: number,
    ) {
      // keep a reference of the dimensions so that we can emit the most recent
      // value upon saving. These values can be later provided so that the editor
      // can be reinitialized using them as a starting point
      this.latestDimensions = {
        ...this.latestDimensions,
        [dimensionName]: dimensionValue,
      };

      this.$emit(`${dimensionName}Change`, dimensionValue);
    },
    onSave() {
      // reset to old value on empty edits
      if (this.currentName.trim() === "") {
        this.currentName = this.value;
        this.$emit("cancel");
        return;
      }

      if (this.currentName === this.value) {
        this.onCancel();
      } else {
        this.$emit("save", {
          dimensionsOnClose: this.latestDimensions,
          newName: this.currentName.trim(),
        });
      }
    },
    onCancel() {
      // reset internal value
      this.currentName = this.value;
      this.$emit("cancel");
    },
    onInvalidInput() {
      if (this.hideInvalidCharsTimeoutId) {
        clearTimeout(this.hideInvalidCharsTimeoutId);
      }
      this.hideInvalidCharsTimeoutId = window.setTimeout(() => {
        this.hideInvalidCharsTimeoutId = null;
      }, invalidCharsErrorVisibleTime);
    },
  },
});
</script>

<template>
  <g>
    <!-- Block all inputs to the kanvas -->
    <rect
      v-bind="overlayStyles"
      fill="transparent"
      @pointerdown.stop.prevent
      @click.stop.prevent="onSave"
      @contextmenu.stop.prevent
    />

    <!-- Save/Cancel actions -->
    <ActionBar
      :transform="`translate(${actionBarPosition})`"
      :actions="actions"
      prevent-context-menu
    />

    <!-- Node name inline editor -->
    <NodeNameTextarea
      v-model="currentName"
      :transform="`translate(${nodePosition.x}, ${nodePosition.y})`"
      :start-width="startWidth"
      :start-height="startHeight"
      :invalid-characters="invalidCharacters"
      @width-change="handleDimensionChange('width', $event)"
      @height-change="handleDimensionChange('height', $event)"
      @save="onSave"
      @cancel="onCancel"
      @invalid-input="onInvalidInput"
    />
    <!-- Validation/Error Message -->
    <foreignObject
      v-if="Boolean(hideInvalidCharsTimeoutId)"
      :width="
        Math.max(latestDimensions.width ?? 0, $shapes.nodeWidthWithPadding)
      "
      :height="70"
      :x="errorMessagePosition.x"
      :y="errorMessagePosition.y"
      data-test-id="validation-msg"
    >
      <div class="invalid-chars-error">
        Characters <span class="chars">{{ invalidCharacters.source }}</span> are
        not allowed and have been removed.
      </div>
    </foreignObject>
  </g>
</template>

<style lang="postcss" scoped>
.invalid-chars-error {
  margin: auto;

  /* full size but avoid blurring of the borders */
  width: calc(100% - 4px);
  border-radius: v-bind("$shapes.selectedItemBorderRadius");
  font-family: "Roboto Condensed", sans-serif;
  font-size: 10px;
  backdrop-filter: blur(5px);
  padding: 5px;
  color: v-bind("$colors.error");
  text-align: center;

  & .chars {
    font-family: "Roboto Mono", sans-serif;
  }
}
</style>
