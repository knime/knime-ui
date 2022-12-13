<script>
import { mapGetters } from 'vuex';
import NodeLabelTextArea from './NodeLabelTextArea.vue';
import NodeEditorActionBar from '../common/NodeEditorActionBar.vue';

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
                this.$emit('save', { newLabel: this.currentLabel });
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
      class="action-bar"
      :transform="`translate(${actionBarPosition})`"
      @save="onSave"
      @cancel="onCancel"
    />

    <!-- Node name inline editor -->
    <NodeLabelTextArea
      v-model="currentLabel"
      :kind="kind"
      :parent-width="$shapes.nodeSize"
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
