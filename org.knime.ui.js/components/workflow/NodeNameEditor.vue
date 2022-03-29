<script>
import NodeNameTextarea from '~/components/workflow/NodeNameTextarea';
import NodeNameEditorActionBar from '~/components/workflow/NodeNameEditorActionBar';
import { mapActions } from 'vuex';

/**
 * Node Name Editor. Component wraps inline textarea and editor action bar (cancle, save). It overlays the whole
 * canvas (via the portal) with a rect that avoids changes to the canvas. Updates of the store are handled here also.
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
        /* start width to avoid jumping on replace of <NodeName> */
        startWidth: {
            type: Number,
            default: null
        },
        /* start height to avoid jumping on replace of <NodeName> */
        startHeight: {
            type: Number,
            default: null
        }
    },
    data() {
        return {
            currentName: this.value
        };
    },
    watch: {
        value(newValue) {
            this.currentName = newValue;
        }
    },
    methods: {
        ...mapActions('workflow', ['updateComponentOrMetanodeName', 'closeNameEditor']),
        saveNameEdit() {
            // reset to old value on empty edits
            if (this.currentName === '') {
                this.currentName = this.value;
            }
            // call api via store
            this.updateComponentOrMetanodeName({ nodeId: this.nodeId, name: this.currentName });
            // close editor
            this.closeNameEditor();
        },
        cancelNameEdit() {
            this.currentName = this.value;
            // close editor
            this.closeNameEditor();
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
      @width="$emit('width', $event)"
      @height="$emit('height', $event)"
      @save="saveNameEdit"
      @close="cancelNameEdit"
    />
  </g>
</template>
