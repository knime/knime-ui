<script>
import { mapState, mapActions, mapGetters } from 'vuex';
import NodeLabelText from './NodeLabelText.vue';
import NodeLabelEditor from './NodeLabelEditor.vue';

export default {
    components: {
        NodeLabelText,
        NodeLabelEditor
    },
    props: {
        nodeId: {
            type: String,
            required: true
        },
        value: {
            type: String,
            default: ''
        },
        kind: {
            type: String,
            default: ''
        },
        nodePosition: {
            type: Object,
            required: true
        },
        editable: {
            type: Boolean,
            default: false
        },
        annotation: {
            type: Object,
            required: false,
            default: () => {}
        }
    },
    emits: ['editStart', 'widthChange', 'heightChange', 'mouseleave', 'mouseenter'],
    computed: {
        ...mapState('workflow', ['labelEditorNodeId']),
        ...mapGetters('selection', ['singleSelectedNode']),

        isEditing() {
            return this.nodeId === this.labelEditorNodeId;
        },

        isSelected() {
            return this.nodeId === this.singleSelectedNode?.id;
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
      <portal to="node-text-editor">
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
        :node-id="nodeId"
        :value="value"
        :kind="kind"
        :annotation="annotation"
        :editable="editable"
        :is-selected="isSelected"
        @request-edit="onRequestEdit"
      />
    </template>
  </g>
</template>

