<script>
import { mapGetters } from 'vuex';

import SaveIcon from '@/assets/ok.svg';
import CancelIcon from '@/assets/cancel.svg';
import ActionBar from '@/components/common/ActionBar.vue';

import NodeLabelTextArea from './NodeLabelTextArea.vue';

export default {
    components: {
        NodeLabelTextArea,
        ActionBar
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
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        },
        numberOfPorts: {
            type: Number,
            required: false,
            default: 0
        }
    },
    emits: ['save', 'cancel'],
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
        actions() {
            return [
                {
                    name: 'save',
                    icon: SaveIcon,
                    onClick: this.onSave,
                    primary: true
                },
                {
                    name: 'cancel',
                    icon: CancelIcon,
                    onClick: this.onCancel
                }
            ];
        },
        actionBarPosition() {
            return [
                this.nodePosition.x + this.$shapes.nodeSize / 2,
                this.nodePosition.y + this.yOffset
            ];
        },
        yOffset() {
            const maxSupportedNumberOfPorts = 5; // max port number that works without offset
            let portOffset = 0;
            if (this.numberOfPorts > maxSupportedNumberOfPorts) {
                portOffset = (this.numberOfPorts - maxSupportedNumberOfPorts) * this.$shapes.portSize;
            }
            return (this.kind === 'metanode'
                ? this.$shapes.metanodeLabelActionBarOffset
                : this.$shapes.nodeLabelActionBarOffset) + portOffset;
        }
    },
    watch: {
        value(newValue) {
            this.currentLabel = newValue;
        }
    },
    methods: {
        onSave() {
            if (this.currentLabel === this.value) {
                this.onCancel();
            } else {
                this.$emit('save', { newLabel: this.currentLabel.trim() });
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
      @click.stop.prevent="onSave"
      @contextmenu.stop.prevent
    />

    <!-- Save/Cancel actions -->
    <ActionBar
      :actions="actions"
      :transform="`translate(${actionBarPosition})`"
      prevent-context-menu
    />

    <!-- Node name inline editor -->
    <NodeLabelTextArea
      v-model="currentLabel"
      :transform="`translate(${nodePosition.x}, ${nodePosition.y})`"
      :kind="kind"
      :parent-width="$shapes.nodeSize"
      :number-of-ports="numberOfPorts"
      @save="onSave"
      @cancel="onCancel"
    />
  </g>
</template>

