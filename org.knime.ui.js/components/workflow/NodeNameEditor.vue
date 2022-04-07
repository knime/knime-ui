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
        pattern: {
            default: null,
            type: RegExp
        },
        nodeId: {
            type: String,
            required: true
        },
        actionBarPosition: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        },
        position: {
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
        saveNameEdit() {
            // reset to old value on empty edits
            if (this.currentName.trim() === '') {
                this.currentName = this.value;
                this.$emit('close');
                return;
            }

            this.$emit('save', { dimensionsOnClose: this.latestDimensions, newName: this.currentName });
        },
        cancelNameEdit() {
            // reset internal value
            this.currentName = this.value;
            
            this.$emit('close');
        }
    }
};
</script>

<template>
  <g>
    <!-- Block all inputs to the kanvas -->
    <rect
      width="100%"
      height="100%"
      x="0"
      y="0"
      fill="transparent"
      @pointerdown.stop.prevent
      @click.stop.prevent
    />
    
    <!-- Save/Cancel actions -->
    <NodeNameEditorActionBar
      :transform="`translate(${actionBarPosition.x}, ${actionBarPosition.y })`"
      @save="saveNameEdit"
      @close="cancelNameEdit"
    />

    <!-- Node name inline editor -->
    <NodeNameTextarea
      v-model="currentName"
      :transform="`translate(${position.x}, ${position.y})`"
      :start-width="startWidth"
      :start-height="startHeight"
      :pattern="pattern"
      @width-change="handleDimensionChange('width', $event)"
      @height-change="handleDimensionChange('height', $event)"
      @save="saveNameEdit"
      @close="cancelNameEdit"
    />
  </g>
</template>
