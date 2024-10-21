<script setup lang="ts">
import { computed } from "vue";

import { ViewState } from "@knime/ui-extension-service";

import type { KnimeNode } from "@/api/custom-types";
import { useStore } from "@/composables/useStore";
import * as nodeUtils from "@/util/nodeUtil";

import ExecuteButton from "./ExecuteButton.vue";
import { useCanNodeExecute } from "./useCanNodeExecute";

type Props = {
  selectedNode: KnimeNode;
  selectedPortIndex: number | null;
};

const props = defineProps<Props>();

const store = useStore();
const dirtyState = computed(() => store.state.nodeConfiguration.dirtyState);

const isViewInDirtyState = computed(() => {
  // when receiving dirty state we check whether
  // the view can be displayed based on said dirty state
  return dirtyState.value.view === ViewState.CONFIG;
});

const isNodeView = computed(() => {
  if (!nodeUtils.isNativeNode(props.selectedNode)) {
    return false;
  }

  return Boolean(props.selectedNode.hasView);
});

const { canExecute } = useCanNodeExecute();

const message = computed(() => {
  const messageTemplate = (kind: string) =>
    `To show the ${kind}, please execute the selected node.`;

  return isViewInDirtyState.value
    ? "To preview the node, please apply your changes and re-execute the node"
    : messageTemplate(isNodeView.value ? "view" : "port output");
});

const label = computed(() => {
  return isViewInDirtyState.value ? "Apply & execute" : "Execute";
});

const applySettingsAndExecute = () => {
  store.dispatch("nodeConfiguration/applySettings", {
    nodeId: props.selectedNode.id,
    execute: true,
  });
};

const execute = () => {
  store.dispatch("workflow/executeNodes", [props.selectedNode.id]);
};

const onClick = () => {
  if (isViewInDirtyState.value) {
    applySettingsAndExecute();
  } else {
    execute();
  }
};
</script>

<template>
  <ExecuteButton
    v-if="canExecute(selectedNode, selectedPortIndex) || isViewInDirtyState"
    :message="message"
    :button-label="label"
    @click="onClick"
  />
</template>
