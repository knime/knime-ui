<script>
import { mapGetters } from 'vuex';
import NodeLabelTextArea from './NodeLabelTextArea.vue';
import NodeEditorActionBar from '../common/NodeEditorActionBar.vue';

/**
 * Node Label Editor. Component wraps inline textarea and editor action bar (cancel, save). It overlays the whole
 * canvas (via the portal) with a rect that avoids changes to the canvas.
 */
export default {
    components: {
        NodeLabelTextArea,
        NodeEditorActionBar
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
        kind: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            currentLabel: this.value
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
        actionBarPosition() {
            return [
                this.$shapes.nodeSize / 2,
                this.kind === 'metanode'
                    ? this.$shapes.metanodeLabelActionBarOffset
                    : this.$shapes.nodeLabelActionBarOffset
            ];
        }
    },
    watch: {
        value(newValue) {
            this.currentLabel = newValue;
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
            if (this.currentLabel.trim() === '') {
                this.currentLabel = this.value;
                this.$emit('cancel');
                return;
            }

            if (this.currentLabel === this.value) {
                this.onCancel();
            } else {
                this.$emit('save', { dimensionsOnClose: this.latestDimensions, newLabel: this.currentLabel.trim() });
            }
        },
        onCancel() {
            // reset internal value
            this.currentLabel = this.value;
            this.$emit('cancel');
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
    <NodeEditorActionBar
      :transform="`translate(${actionBarPosition})`"
      class="action-bar"
      @save="onSave"
      @cancel="onCancel"
    />

    <!-- Node name inline editor -->
    <NodeLabelTextArea
      v-model="currentLabel"
      :kind="kind"
      :parent-width="$shapes.nodeSize"
      :max-width="$shapes.maxNodeAnnotationWidth"
      @save="onSave"
      @cancel="onCancel"
    />
  </g>
</template>

<style lang="postcss" scoped>
.action-bar {
  z-index: 9;
  backdrop-filter: blur(10px);
}
</style>
