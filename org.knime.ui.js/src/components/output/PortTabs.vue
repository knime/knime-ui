<script>
import FlowVarTabIcon from 'webapps-common/ui/assets/img/icons/both-flow-variables.svg';
import TabBar from 'webapps-common/ui/components/TabBar.vue';

import portIcon from '@/components/common/PortIconRenderer';

/**
 * Tab Bar that displays output ports of a given node.
 * Can be used like a form element, since it emits an `input` event
 * */
export const portIconSize = 9;

export default {
    components: {
        TabBar
    },
    props: {
        /**
         * Node as given in a workflow store
         */
        node: {
            type: Object,
            default: () => ({})
        },
        value: {
            type: String,
            default: null
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        possibleTabValues() {
            if (!this.node || !this.node.outPorts.length) {
                return [];
            }

            let { outPorts, kind } = this.node;
            let tabs = [];

            if (kind !== 'metanode') {
                // For normal nodes, the 0th port is the hidden flow variable port.
                // Metanodes don't have Mickey Mouse ears, so all ports are actual output ports.
                outPorts = outPorts.slice(1);
                tabs.push({
                    value: '0',
                    label: 'Flow Variables',
                    icon: FlowVarTabIcon
                });
            }

            // all remaining ports go before the flow variables
            tabs.unshift(
                ...outPorts.map(
                    port => ({
                        value: String(port.index),
                        icon: portIcon(port, portIconSize),
                        label: `${port.index}: ${port.name}`
                    })
                )
            );
            return tabs;
        }
    }
};
</script>

<template>
  <TabBar
    name="output-port"
    :value="value"
    :disabled="disabled"
    :possible-values="possibleTabValues"
    @update:value="$emit('input', $event)"
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

>>> svg,
>>> svg * {
  pointer-events: none !important;
  width: 14px;
}

/* Flow variable icon */
>>> circle[r="3"] {
  fill: var(--knime-coral);
  stroke: var(--knime-coral);
  stroke-width: calc(32px / 14);
}

>>> path {
  stroke-width: calc(32px / 14);
}

/* Flow variable icon disabled */
>>> input:disabled + span {
  & circle {
    fill: var(--knime-coral-light);
    stroke: var(--knime-coral-light);
  }

  & polygon,
  & rect {
    fill: var(--knime-silver-sand);
    stroke: var(--knime-silver-sand);
  }
  
  & path {
    stroke: var(--knime-silver-sand);
  }
}

/* Flow variable icon active/hover */
>>> input:not(:disabled):checked + span circle[r="3"],
>>> input:not(:disabled) + span:hover circle[r="3"] {
  fill: var(--knime-coral-dark);
  stroke: var(--knime-coral-dark);
}
</style>
