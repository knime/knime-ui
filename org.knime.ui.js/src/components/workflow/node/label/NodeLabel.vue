<script>
import { mapState, mapActions } from 'vuex';
import NodeLabelText from './NodeLabelText.vue';
import NodeLabelEditor from './NodeLabelEditor.vue';

export default {
    components: {
        NodeLabelText,
        NodeLabelEditor
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
        },
        nodePosition: {
            type: Object,
            required: true
        }
    },
    computed: {
        ...mapState('workflow', ['labelEditorNodeId']),
        isEditing() {
            return this.nodeId === this.labelEditorNodeId;
        }
    },
    methods: {
        ...mapActions('workflow', ['renameNodeLabel', 'openLabelEditor', 'closeLabelEditor']),
        onRequestEdit() {
            this.openLabelEditor(this.nodeId);
        },
        onSave({ newLabel }) {
            this.renameNodeLabel({ nodeId: this.nodeId, label: newLabel });

            // Schedule closing editor on next the event loop run
            // to allow styles to apply properly when editor is destroyed
            setTimeout(() => {
                this.closeLabelEditor();
            }, 100);
        },
        onCancel() {
            this.closeLabelEditor();
        }
    }
};
</script>

<template>
  <g>
    <template v-if="isEditing">
      <portal to="node-label-editor">
        <NodeLabelEditor
          :node-id="nodeId"
          :value="value"
          :kind="kind"
          :node-position="nodePosition"
          @save="onSave"
          @cancel="onCancel"
        />
      </portal>
    </template>
    <template v-else>
      <NodeLabelText
        :value="value"
        :kind="kind"
        @request-edit="onRequestEdit"
        @contextmenu="$emit('contextmenu', $event)"
      />
    </template>
  </g>
</template>

