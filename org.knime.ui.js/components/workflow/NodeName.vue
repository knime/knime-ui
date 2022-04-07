<script>
import { mapActions, mapState } from 'vuex';

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
        actionBarPosition: {
            type: Object,
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
            }
        };
    },
    computed: {
        ...mapState('workflow', ['nameEditorNodeId']),
        isEditorOpen() {
            return this.nameEditorNodeId === this.nodeId;
        }
    },
    methods: {
        ...mapActions('workflow', ['openNameEditor', 'updateComponentOrMetanodeName', 'closeNameEditor']),
        handleEditRequest() {
            this.openNameEditor(this.nodeId);
            this.$emit('name-change-request');
        },
        handleNameSave({ dimensionsOnClose, newName }) {
            this.updateComponentOrMetanodeName({ nodeId: this.nodeId, name: newName });
            this.editorInitialDimensions = dimensionsOnClose;

            // Schedule closing editor on next the event loop run
            // to allow styles to apply properly when editor is destroyed
            setTimeout(() => {
                this.closeNameEditor();
            }, 0);
        }
    }
};
</script>

<template>
  <g>
    <template v-if="isEditorOpen">
      <portal
        v-if="isEditorOpen"
        to="node-name-editor"
      >
        <NodeNameEditor
          :node-id="nodeId"
          :value="value"

          :start-width="editorInitialDimensions.width"
          :start-height="editorInitialDimensions.height"
          :action-bar-position="actionBarPosition"
          :position="nodePosition"
          @width-change="$emit('width-change', $event)"
          @height-change="$emit('height-change', $event)"
          @save="handleNameSave"
          @close="closeNameEditor"
        />
      </portal>
    </template>

    <template v-else>
      <NodeNameText
        :editable="editable"
        :value="value"
        @width-change="$emit('width-change', $event)"
        @height-change="$emit('height-change', $event)"
        @request-edit="handleEditRequest"
        @mouseleave="$emit('mouseleave', $event)"
        @mouseenter="$emit('mouseenter', $event)"
      />
    </template>
  </g>
</template>

