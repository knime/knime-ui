<script>
import Vue from 'vue';
import FlowVarTabIcon from '~/assets/flow-variables.svg?inline';
import portIcon from './PortIconRenderer';
import TabBar, { tabBarMixin } from '~/webapps-common/ui/components/TabBar';
import { supportsPort } from '~/components/output/NodeOutput';

/**
 * Tab Bar that displays output ports of a given node.
 * Can be used like a form element, since it emits an `input` event
 * */
export default {
    components: {
        TabBar
    },
    mixins: [tabBarMixin],
    props: {
        /**
         * Node as given in a workflow store
         */
        node: {
            type: Object,
            default: () => ({})
        }
        // `value` prop: see mixin
    },
    data() {
        return {
            nodeChanged: false
        };
    },
    computed: {
        isMetaNode() {
            return this.node.kind === 'metanode';
        },
        outPorts() {
            return this.node.outPorts || [];
        },
        isExecuted() {
            if (this.isMetaNode) {
                return this.outPorts.map(port => port.nodeState === 'EXECUTED');
            }
            return this.node.state?.executionState === 'EXECUTED';
        },
        possibleTabValues() {
            let { outPorts } = this;
            if (!outPorts.length) {
                return [];
            }
            // Metanodes don't have Mickey Mouse ears, so all ports are actual output ports.
            // For normal nodes, the 0th port is the hidden flow variable port.
            let firstPortIndex = this.isMetaNode ? 0 : 1;
            let result = [];
            for (let i = firstPortIndex; i < this.outPorts.length; i++) {
                let port = outPorts[i];
                let disabled = port.inactive || !supportsPort(port);
                if (this.isMetaNode) {
                    disabled = disabled || !this.isExecuted[i];
                } else {
                    disabled = disabled || !this.isExecuted;
                }
                let title = null;
                if (disabled) {
                    if (supportsPort(port)) {
                        title = 'No output data';
                    } else {
                        title = 'Unsupported data type';
                    }
                }
                result.push({
                    value: String(port.index),
                    label: `${i - firstPortIndex + 1}: ${port.name}`,
                    icon: portIcon(port),
                    disabled,
                    title
                });
            }
            if (!this.isMetaNode) {
                // is disabled if either the port is inactive or is not executed
                let disabled = outPorts[0].inactive || !this.isExecuted;
                // hidden flow variable port, displayed as the last tab
                result.push({
                    value: '0',
                    label: 'Flow Variables',
                    icon: FlowVarTabIcon,
                    disabled,
                    title: disabled ? 'No output data' : null
                });
            }
            return result;
        }
    },
    watch: {
        activeTab(value) {
            this.onChange(value);
        },
        node() {
            // when the node changes, reset the tab bar selection
            consola.trace('Port selector bar got new node');
            this.nodeChanged = true; // prevent duplicate call of isExecuted watcher
            Vue.nextTick(() => { this.nodeChanged = false; });
            let oldActiveTab = this.activeTab;
            this.resetSelection();
            if (this.activeTab === oldActiveTab) {
                // even though the active tab hasn't changed, we need to artificially fire an input event,
                // because we're dealing with a new node
                this.$emit('input', this.activeTab);
            }
        },
        // The user is looking at a node that has just finished executing, just been reset, or
        // in case of a metanode, one of its port's status has changed
        isExecuted(after, before) {
            if (this.nodeChanged) {
                return;
            }
            if (Array.isArray(before)) { // Metanode
                if (this.activeTab !== null && before[this.activeTab] === after[this.activeTab]) {
                    // The port corresponding to the tab that the user is currently looking at is not affected
                    return;
                }
            }
            // when the execution state changes, reset the tab bar selection
            this.resetSelection();
        }
    },
    methods: {
        // this finds the first enabled tab, and selects it
        resetSelection() {
            consola.trace('Port selector bar resetting selection');
            tabBarMixin.created.apply(this);
        },
        onChange(value) {
            /**
             * Update event. Fired when the selection is changed.
             * This also happens implicitly on initialization / when the `node` prop changes.
             * Since this event is named 'input', it allows to use this component like a form element with `v-model`.
             *
             * @event select
             * @type {String}
             */
            this.$emit('input', value);
        }
    }
};
</script>

<template>
  <TabBar
    name="output-port"
    :value.sync="activeTab"
    :possible-values="possibleTabValues"
  />
</template>

<style lang="postcss" scoped>
/* override carousel scroller */
.shadow-wrapper {
  margin: 0;

  &::before,
  &::after {
    content: none;
  }

  & >>> .carousel {
    padding: 0;

    &::before,
    &::after {
      left: 0;
      right: 0;
    }
  }
}

>>> svg {
  pointer-events: none;
}

/* Flow variable icon */
>>> circle[r="2.5"] {
  fill: var(--knime-coral);
}

/* Flow variable icon disabled */
>>> input:disabled + span circle[r="2.5"] {
  fill: var(--knime-coral-light);
}

/* Flow variable icon active/hover */
>>> input:not(:disabled):checked + span circle[r="2.5"],
>>> input:not(:disabled) + span:hover circle[r="2.5"] {
  fill: var(--knime-coral-dark);
}
</style>
