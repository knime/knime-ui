<script>
import FlowVarTabIcon from '~/assets/flow-variables.svg?inline';
import portIcon from './PortIconRenderer';
import TabBar, { tabBarMixin } from '~/webapps-common/ui/components/TabBar';

export default {
    components: {
        TabBar
    },
    mixins: [tabBarMixin],
    props: {
        node: {
            type: Object,
            default: () => ({})
        }
    },
    computed: {
        isMetaNode() {
            return this.node.kind === 'metanode';
        },
        outPorts() {
            return this.node.outPorts || [];
        },
        isExecuted() {
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
                let disabled = !this.isExecuted || port.inactive || !this.supportsPortType(port.type);
                let title = null;
                if (disabled) {
                    if (this.supportsPortType(port.type)) {
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
                result.push({
                    value: '0',
                    label: 'Flow Variables',
                    icon: FlowVarTabIcon,
                    disabled: true,
                    title: 'Unsupported data type'
                });
            }
            return result;
        }
    },
    watch: {
        activeTab(value) {
            this.onUpdate(value);
        },
        node() {
            // when the node changes, reset the tab bar selection
            let oldActiveTab = this.activeTab;
            this.resetSelection();
            if (this.activeTab && this.activeTab === oldActiveTab) {
                // even though the active tab hasn't changed, we need to artificially fire a selection event,
                // because we're dealing with a new node
                this.$emit('select', this.activeTab);
            }
        },
        isExecuted() {
            // when the execution state changes, reset the tab bar selection
            this.resetSelection();
        }
    },
    methods: {
        resetSelection() {
            tabBarMixin.created.apply(this);
        },
        supportsPortType(type) {
            return type === 'table';
        },
        onUpdate(value) {
            /**
             * Update event. Fired when the selection is changed.
             * This also happens implicitly on initialization / when the `node` prop changes
             *
             * @event select
             * @type {String}
             */
            this.$emit('select', value);
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
