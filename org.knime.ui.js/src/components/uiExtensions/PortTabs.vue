<script>
import FlowVarTabIcon from "@knime/styles/img/icons/expose-flow-variables.svg";
import Eye from "@knime/styles/img/icons/eye.svg";

import portIcon from "@/components/common/PortIconRenderer";
import { useCompositeViewActions } from "@/components/uiExtensions/compositeView/useCompositeViewActions";
import { workflowDomain } from "@/lib/workflow-domain";

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
  props: {
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

      const { outPorts } = this.node;

      const isMetanode = workflowDomain.node.isMetaNode(this.node);
      const ports = (
        isMetanode
          ? outPorts
          : outPorts.slice(1)
      ).map(portToPortTab);

      return (
        []
          .concat(
            this.hasViewTab
              ? {
                  value: "view",
                  label: "View",
                  icon: Eye,
                  ...useCompositeViewActions(this.node),
                }
              : null,
          )
          .concat(ports)
          .concat(
            isMetanode
              ? null
              : { value: "0", label: "Flow Variables", icon: FlowVarTabIcon },
          )
          .filter(Boolean)
      );
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.applyShortcutAllowlist();
    });
  },
  updated() {
    this.$nextTick(() => {
      this.applyShortcutAllowlist();
    });
  },
  methods: {
    applyShortcutAllowlist() {
      if (!this.$refs.tabBar) {
        return;
      }
      this.$refs.tabBar
        .querySelectorAll("button")
        .forEach((btn) => {
          btn.dataset.allowShortcuts =
            "activateOutputPort,detachOutputPort";
        });
    },
  },
};
</script>

<template>
  <nav ref="tabBar" class="port-tabs" aria-label="Output ports">
    <button
      v-for="tab in possibleTabValues"
      :key="tab.value"
      type="button"
      :class="['port-tab', { active: modelValue === tab.value }]"
      :disabled="disabled"
      :title="tab.label"
      @click="$emit('update:modelValue', tab.value)"
    >
      <component :is="tab.icon" v-if="tab.icon" class="tab-icon" />
      <span class="tab-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<style lang="postcss" scoped>
.port-tabs {
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--knime-silver-sand);
  padding: 0 var(--space-8, 8px);
  gap: 0;
}

.port-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 12px;
  font-family: inherit;
  color: var(--knime-stone-gray);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: color 100ms, border-color 100ms;

  &:hover:not(:disabled) {
    color: var(--knime-masala);
  }

  &.active {
    color: var(--knime-masala);
    border-bottom-color: var(--knime-cornflower);
    font-weight: 600;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

.tab-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;

  & :deep(*) {
    pointer-events: none;
  }
}

.tab-label {
  line-height: 1;
}

/* Flow variable icon coloring */
.port-tab :deep(circle[r="3"]) {
  fill: var(--knime-coral);
  stroke: var(--knime-coral);
}

.port-tab.active :deep(circle[r="3"]),
.port-tab:hover:not(:disabled) :deep(circle[r="3"]) {
  fill: var(--knime-coral-dark);
  stroke: var(--knime-coral-dark);
}

.port-tab:disabled :deep(circle[r="3"]) {
  fill: var(--knime-coral-light);
  stroke: var(--knime-coral-light);
}

.port-tab:disabled :deep(polygon),
.port-tab:disabled :deep(rect) {
  fill: var(--knime-silver-sand);
  stroke: var(--knime-silver-sand);
}

.port-tab:disabled :deep(path) {
  stroke: var(--knime-silver-sand);
}
</style>
