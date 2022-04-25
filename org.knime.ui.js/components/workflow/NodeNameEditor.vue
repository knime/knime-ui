<script>
import NodeNameTextarea from '~/components/workflow/NodeNameTextarea';
import NodeNameEditorActionBar from '~/components/workflow/NodeNameEditorActionBar';

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
        // TODO: is this pattern being used?
        pattern: {
            default: null,
            type: RegExp
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
            currentName: this.value,
            latestDimensions: {
                width: null,
                height: null
            }
        };
    },
    computed: {
        actionBarPosition() {
            return [
                this.nodePosition.x + this.$shapes.nodeSize / 2,
                this.nodePosition.y - this.$shapes.nodeSelectionPadding[0] - this.latestDimensions.height
            ];
        }
    },
    watch: {
        // TODO: why indirect?
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
            // TODO: do sanitization in NodeNameTextarea

            // reset to old value on empty edits
            if (this.currentName.trim() === '') {
                this.currentName = this.value;
                this.$emit('cancel');
                return;
            }

            // TODO: will the name be changed if it is the same as before?
            // Emit cancel and save?
            this.$emit('save', { dimensionsOnClose: this.latestDimensions, newName: this.currentName.trim() });
        },
        onCancel() {
            // reset internal value
            this.currentName = this.value;
            this.$emit('cancel');
        }
    }
};
</script>

<template>
  <g>
    <!-- Block all inputs to the kanvas
        TODO: this is not sufficient just scroll a bit to see that
    -->
    <rect
      width="100%"
      height="100%"
      fill="transparent"
      @pointerdown.stop.prevent
      @click.stop.prevent
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
      :pattern="pattern"
      @width-change="handleDimensionChange('width', $event)"
      @height-change="handleDimensionChange('height', $event)"
      @save="onSave"
      @cancel="onCancel"
    />
  </g>
</template>
