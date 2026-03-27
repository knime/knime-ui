<script lang="ts">
export const portIconSize = 9;
</script>

<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from "vue";

import { KdsTabBar } from "@knime/kds-components";
import type { KdsTabBarItem } from "@knime/kds-components";

import { useCompositeViewActions } from "@/components/uiExtensions/compositeView/useCompositeViewActions";
import { workflowDomain } from "@/lib/workflow-domain";

const props = withDefaults(
  defineProps<{
    node: Record<string, any>;
    modelValue?: string | null;
    disabled?: boolean;
    hasViewTab?: boolean;
  }>(),
  {
    node: () => ({}),
    modelValue: null,
    disabled: false,
    hasViewTab: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const selectedTab = computed({
  get: () => props.modelValue ?? "",
  set: (val: string | number) => emit("update:modelValue", String(val)),
});

const tabs = computed<KdsTabBarItem[]>(() => {
  if (!props.node || !props.node.outPorts?.length) {
    return [];
  }

  const { outPorts } = props.node;
  const isMetanode = workflowDomain.node.isMetaNode(props.node);

  const portTabs: KdsTabBarItem[] = (
    isMetanode ? outPorts : outPorts.slice(1)
  ).map((port: any) => ({
    id: `port-tab-${port.index}`,
    value: String(port.index),
    label: `${port.index}: ${port.name}`,
    panelId: `port-panel-${port.index}`,
  }));

  const result: KdsTabBarItem[] = [];

  if (props.hasViewTab) {
    const compositeActions = useCompositeViewActions(props.node);
    result.push({
      id: "port-tab-view",
      value: "view",
      label: "View",
      panelId: "port-panel-view",
      ...compositeActions,
    });
  }

  result.push(...portTabs);

  if (!isMetanode) {
    result.push({
      id: "port-tab-flow-vars",
      value: "0",
      label: "Flow Variables",
      panelId: "port-panel-flow-vars",
    });
  }

  return result;
});

const tabBarRef = useTemplateRef<InstanceType<typeof KdsTabBar>>("tabBar");

const applyShortcutAllowlist = () => {
  const el = (tabBarRef.value as any)?.$el;
  if (!el) return;
  el.querySelectorAll("button").forEach((btn: HTMLElement) => {
    btn.dataset.allowShortcuts = "activateOutputPort,detachOutputPort";
  });
};

watch(tabs, () => nextTick(applyShortcutAllowlist), { immediate: true });
</script>

<template>
  <KdsTabBar
    ref="tabBar"
    v-model="selectedTab"
    :tabs="tabs"
    :disabled="disabled"
    size="small"
  />
</template>
