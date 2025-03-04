<script setup lang="ts">
import { toRefs } from "vue";

import type { Node } from "@/api/gateway-api/generated-api";
import { useNodeActionBar } from "../../common/useNodeActionBar";
import ActionBar from "../common/ActionBar.vue";
import { nodeIdText } from "../util/textStyles";

import { getActionBarIcons } from "./nodeActionBarIcons";
/**
 *  Displays a bar of action buttons above nodes
 */

type Props = {
  nodeId: string;
  nodeKind: Node.KindEnum;
  isNodeSelected?: boolean;
  canExecute?: boolean;
  canCancel?: boolean;
  canReset?: boolean;
  canConfigure?: boolean;
  canStep?: boolean | null;
  canPause?: boolean | null;
  canResume?: boolean | null;
  canOpenView?: boolean | null;
};

const props = withDefaults(defineProps<Props>(), {
  isNodeSelected: false,
  canExecute: false,
  canCancel: false,
  canReset: false,
  canConfigure: false,
  canStep: null,
  canPause: null,
  canResume: null,
  canOpenView: null,
});

const {
  isNodeSelected,
  canExecute,
  canCancel,
  canReset,
  canConfigure,
  canStep,
  canPause,
  canResume,
  canOpenView,
} = toRefs(props);

const { visibleActions } = useNodeActionBar({
  nodeId: props.nodeId,
  nodeKind: props.nodeKind,
  isNodeSelected,
  canExecute,
  canCancel,
  canReset,
  canConfigure,
  canStep,
  canPause,
  canResume,
  canOpenView,
  icons: getActionBarIcons(),
});
</script>

<template>
  <Container>
    <ActionBar :actions="visibleActions" />

    <Text
      label="NodeId"
      :anchor-x="0.5"
      :position-y="-$shapes.nodeIdMargin - 8"
      :resolution="2"
      :scale="nodeIdText.downscalingFactor"
      :style="nodeIdText.styles"
      :round-pixels="true"
    >
      {{ nodeId }}
    </Text>
  </Container>
</template>
