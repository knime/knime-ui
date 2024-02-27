<script>
import FlowVarTabIcon from "webapps-common/ui/assets/img/icons/expose-flow-variables.svg";
import TabBar from "webapps-common/ui/components/TabBar.vue";
import Eye from "webapps-common/ui/assets/img/icons/eye.svg";

import portIcon from "@/components/common/PortIconRenderer";

import { isNodeMetaNode } from "@/util/nodeUtil";

export const portIconSize = 9;

const portToPortTab = (port) => ({
  value: String(port.index),
  icon: portIcon(port, portIconSize),
  label: `${port.index}: ${port.name}`,
});

/**
 * Tab Bar that displays output ports of a given node.
 * Can be used like a form element
 * */
export default {
  components: {
    TabBar,
  },
  model: {
    prop: "modelValue",
    event: "update:modelValue",
  },
  props: {
    /**
     * Node as given in a workflow store
     */
    node: {
      type: Object,
      default: () => ({}),
    },
    modelValue: {
      type: String,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    hasViewTab: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue"],
  computed: {
    possibleTabValues() {
      if (!this.node || !this.node.outPorts.length) {
        return [];
      }

      let { outPorts } = this.node;

      const isMetanode = isNodeMetaNode(this.node);
      const ports = (
        isMetanode
          ? // Metanodes don't have Mickey Mouse ears, so all ports are actual output ports.
            outPorts
          : // For normal nodes, the 0th port is the hidden flow variable port, so we remove it for now
            // and later reposition it to the end
            outPorts.slice(1)
      ).map(portToPortTab);

      return (
        []
          .concat(
            this.hasViewTab
              ? { value: "view", label: "View", icon: Eye }
              : null,
          )
          // all ports go before the flow variables
          .concat(ports)
          // add the flow variables but skip for metanodes which don't have any
          .concat(
            isMetanode
              ? null
              : { value: "0", label: "Flow Variables", icon: FlowVarTabIcon },
          )
          .filter(Boolean)
      );
    },
  },
};
</script>

<template>
  <TabBar
    name="output-port"
    :model-value="modelValue"
    :disabled="disabled"
    :possible-values="possibleTabValues"
    @update:model-value="$emit('update:modelValue', $event)"
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

  & :deep(.carousel) {
    padding: 0;

    &::before,
    &::after {
      left: 0;
      right: 0;
      bottom: 6px;
    }
  }
}

:deep(svg),
:deep(svg *) {
  pointer-events: none !important;
  width: 14px;
}

/* Flow variable icon */
:deep(circle[r="3"]) {
  fill: var(--knime-coral);
  stroke: var(--knime-coral);
  stroke-width: calc(32px / 14);
}

:deep(path) {
  stroke-width: calc(32px / 14);
}

/* Flow variable icon disabled */
:deep(input:disabled + span) {
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
:deep(input:not(:disabled):checked + span circle[r="3"]),
:deep(input:not(:disabled) + span:hover circle[r="3"]) {
  fill: var(--knime-coral-dark);
  stroke: var(--knime-coral-dark);
}
</style>
