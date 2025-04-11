<script setup lang="ts">
import { toRefs } from "vue";

import type { Node } from "@/api/gateway-api/generated-api";
import CancelIcon from "@/assets/cancel.svg";
import OpenDialogIcon from "@/assets/configure-node.svg";
import ExecuteIcon from "@/assets/execute.svg";
import OpenViewIcon from "@/assets/open-view.svg";
import PauseIcon from "@/assets/pause-execution.svg";
import ResetIcon from "@/assets/reset-all.svg";
import ResumeIcon from "@/assets/resume-execution.svg";
import StepIcon from "@/assets/step-execution.svg";
import ActionBar from "@/components/workflowEditor/common/svgActionBar/ActionBar.vue";
import { useNodeActionBar } from "../../common/useNodeActionBar";

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
  /*
   * The props below can either be true, false or unset.
   */
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
  icons: {
    CancelIcon,
    OpenDialogIcon,
    ExecuteIcon,
    OpenViewIcon,
    PauseIcon,
    ResetIcon,
    ResumeIcon,
    StepIcon,
  },
});
</script>

<template>
  <g>
    <ActionBar :actions="visibleActions" />

    <text class="node-id" text-anchor="middle" :y="-$shapes.nodeIdMargin">
      {{ nodeId }}
    </text>
  </g>
</template>

<style scoped>
.node-id {
  font:
    normal 10px "Roboto Condensed",
    sans-serif;
  pointer-events: none;
}
</style>
