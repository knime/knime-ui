<script>
import { mapActions } from 'vuex';

import NodeNameEditor from '~/components/workflow/NodeNameEditor';
import NodeNameText from '~/components/workflow/NodeNameText';

/**
 * Node name coordinates everything related to the name editing behavior. Determines whether to display
 * the editor or the label itself, as well as handles updates to the store when name changes are made
 */
export default {
    components: { NodeNameEditor, NodeNameText },
    props: {
        nodeId: {
            type: String,
            required: true
        },
        nodePosition: {
            type: Object,
            required: true
        },
        editable: {
            type: Boolean,
            default: false
        },
        value: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            editorInitialDimensions: {
                width: null,
                height: null
            },
            isEditing: false
        };
    },
    methods: {
        ...mapActions('workflow', ['renameContainer']),
        onRequestEdit() {
            this.isEditing = true;
            this.$emit('edit-start');
        },
        onSave({ dimensionsOnClose, newName }) {
            this.renameContainer({ nodeId: this.nodeId, name: newName });
            this.editorInitialDimensions = dimensionsOnClose;

            // Schedule closing editor on next the event loop run
            // to allow styles to apply properly when editor is destroyed
            setTimeout(() => {
                this.isEditing = false;
            }, 100);
        },
        onCancel() {
            this.isEditing = false;
        }
    }
};
</script>

<template>
  <g>
    <template v-if="isEditing">
      <portal to="node-name-editor">
        <NodeNameEditor
          :node-id="nodeId"
          :node-position="nodePosition"
          :value="value"
          :start-width="editorInitialDimensions.width"
          :start-height="editorInitialDimensions.height"
          @width-change="$emit('width-change', $event)"
          @height-change="$emit('height-change', $event)"
          @save="onSave"
          @cancel="onCancel"
        />
      </portal>
    </template>

    <template v-else>
      <NodeNameText
        :editable="editable"
        :value="value"
        @width-change="$emit('width-change', $event)"
        @height-change="$emit('height-change', $event)"
        @request-edit="onRequestEdit"
        @mouseleave="$emit('mouseleave', $event)"
        @mouseenter="$emit('mouseenter', $event)"
        @contextmenu="$emit('contextmenu', $event)"
      />
    </template>
  </g>
</template>

