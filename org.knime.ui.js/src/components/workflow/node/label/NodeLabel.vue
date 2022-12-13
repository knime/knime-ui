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
        /**
         * @values "left", "center", "right"
         */
        textAlign: {
            type: String,
            default: 'center',
            validator: val => ['left', 'center', 'right'].includes(val)
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
        onSave({ dimensionsOnClose, newLabel }) {
            this.renameNodeLabel({ nodeId: this.nodeId, label: newLabel });
            this.editorInitialDimensions = dimensionsOnClose;

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
      <NodeLabelEditor
        :node-id="nodeId"
        :value="value"
        :kind="kind"
        @save="onSave"
        @cancel="onCancel"
      />
    </template>
    <template v-else>
      <NodeLabelText
        :value="value"
        :kind="kind"
        @request-edit="onRequestEdit"
      />
    </template>
  </g>
</template>

<style lang="postcss" scoped>
</style>
