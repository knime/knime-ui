<script>
import { mapGetters } from 'vuex';

import NodeNameTextarea from '~/components/workflow/NodeNameTextarea';
import NodeNameEditorActionBar from '~/components/workflow/NodeNameEditorActionBar';

const invalidCharsErrorVisibleTime = 4000; // ms

/**
 * Node Name Editor. Component wraps inline textarea and editor action bar (cancel, save). It overlays the whole
 * canvas (via the portal) with a rect that avoids changes to the canvas.
 */
export default {
    components: {
        NodeNameEditorActionBar,
        NodeNameTextarea
    },
    props: {
        value: {
            type: String,
            default: ''
        },
        nodeId: {
            type: String,
            required: true
        },
        nodePosition: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        },
        /* start width to initialize the editor with */
        startWidth: {
            type: Number,
            default: null
        },
        /* start height to initialize the editor with */
        startHeight: {
            type: Number,
            default: null
        }
    },
    data() {
        return {
            hideInvalidCharsTimeoutId: null,
            currentName: this.value,
            latestDimensions: {
                width: null,
                height: null
            }
        };
    },
    computed: {
        ...mapGetters('canvas', ['viewBox']),
        overlayStyles() {
            const { left, top } = this.viewBox;
            return {
                width: '100%',
                height: '100%',
                x: left,
                y: top
            };
        },
        invalidCharacters() {
            return /[*?#:"<>%~|/\\]/g;
        },
        actionBarPosition() {
            return [
                this.nodePosition.x + this.$shapes.nodeSize / 2,
                this.nodePosition.y - this.$shapes.nodeSelectionPadding[0] - this.latestDimensions.height
            ];
        }
    },
    watch: {
        value(newValue) {
            this.currentName = newValue;
        }
    },
    methods: {
        handleDimensionChange(dimensionName, dimensionValue) {
            // keep a reference of the dimensions so that we can emit the most recent
            // value upon saving. These values can be later provided so that the editor
            // can be reinitialized using them as a starting point
            this.latestDimensions = { ...this.latestDimensions, [dimensionName]: dimensionValue };

            this.$emit(`${dimensionName}-change`, dimensionValue);
        },
        onSave() {
            // reset to old value on empty edits
            if (this.currentName.trim() === '') {
                this.currentName = this.value;
                this.$emit('cancel');
                return;
            }

            if (this.currentName === this.value) {
                this.onCancel();
            } else {
                this.$emit('save', { dimensionsOnClose: this.latestDimensions, newName: this.currentName.trim() });
            }
        },
        onCancel() {
            // reset internal value
            this.currentName = this.value;
            this.$emit('cancel');
        },
        onInvalidInput() {
            if (this.hideInvalidCharsTimeoutId) {
                clearTimeout(this.hideInvalidCharsTimeoutId);
            }
            this.hideInvalidCharsTimeoutId = setTimeout(() => {
                this.hideInvalidCharsTimeoutId = null;
            }, invalidCharsErrorVisibleTime);
        }
    }
};
</script>

<template>
  <g>
    <!-- Block all inputs to the kanvas -->
    <rect
      v-bind="overlayStyles"
      fill="transparent"
      @pointerdown.stop.prevent
      @click.stop.prevent
      @contextmenu.stop.prevent
    />

    <!-- Save/Cancel actions -->
    <NodeNameEditorActionBar
      :transform="`translate(${actionBarPosition})`"
      @save="onSave"
      @cancel="onCancel"
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
      :width="Math.max(latestDimensions.width, $shapes.nodeWidthWithPadding)"
      :height="70"
      :x="nodePosition.x + $shapes.nodeSize/2 - Math.max(latestDimensions.width, $shapes.nodeWidthWithPadding)/2"
      :y="nodePosition.y"
    >
      <div class="invalid-chars-error">
        Characters <span class="chars">{{ invalidCharacters.source }}</span> are not allowed and were removed.
      </div>
    </foreignObject>
  </g>
</template>

<style lang="postcss" scoped>
.invalid-chars-error {
  margin: auto;

  /* full size but avoid blurring of the borders */
  width: calc(100% - 4px);
  border-radius: var(--selected-node-border-radius-shape);
  font-family: 'Roboto Condensed', sans-serif;
  font-size: 10px;
  backdrop-filter: blur(5px);
  padding: 5px;
  color: var(--error-color);
  text-align: center;

  & .chars {
    font-family: 'Roboto Mono', sans-serif;
  }
}
</style>
