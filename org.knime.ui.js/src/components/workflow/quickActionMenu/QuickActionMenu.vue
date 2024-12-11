<script setup lang="ts">
import { computed, toRefs, watch } from "vue";

import { Button } from "@knime/components";
import AiIcon from "@knime/styles/img/icons/ai-general.svg";

import type { NodeRelation } from "@/api/custom-types";
import { type NodePort, type XY } from "@/api/gateway-api/generated-api";
import FloatingMenu from "@/components/common/FloatingMenu.vue";
import KaiQuickBuild from "@/components/kai/KaiQuickBuild.vue";
import NodePortActiveConnector from "@/components/workflow/ports/NodePortActiveConnector.vue";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { useStore } from "@/composables/useStore";
import * as $shapes from "@/style/shapes";
import type { DragConnector } from "../ports/NodePort/types";

import QuickAddNodeMenu from "./quickAdd/QuickAddNodeMenu.vue";
import { useQuickActionMenu } from "./useQuickActionMenu";

export type QuickActionMenuProps = {
  nodeId?: string | null;
  position: XY;
  port?: NodePort | null;
  nodeRelation?: NodeRelation | null;
  // required for recalculation of the position if opened with key shortcuts
  positionOrigin?: "mouse" | "calculated";
};

const props = withDefaults(defineProps<QuickActionMenuProps>(), {
  nodeId: null,
  port: null,
  nodeRelation: null,
  positionOrigin: "mouse",
});

const menuWidth = 360;

defineEmits(["menuClose"]);

const store = useStore();

const hasConnector = computed(
  () => store.state.workflow.quickActionMenu.hasConnector,
);

const availablePortTypes = computed(
  () => store.state.application.availablePortTypes,
);
const zoomFactor = computed(() => store.state.canvas.zoomFactor);

const canvasPosition = computed(() => {
  let pos = { ...props.position };
  const halfPort = $shapes.portSize / 2;

  // x: align with the port arrow (position is the center of the port)
  if (props.nodeRelation === "PREDECESSORS") {
    pos.x -= halfPort;
  } else {
    pos.x += halfPort;
  }

  return pos;
});

const portIndex = computed(() => {
  // we need this to be explicit null if no port is given for the api to work
  // falsy will not work as the index can be 0 (which is falsy)
  return props.port ? props.port.index : null;
});

const fakePortConnector = computed<DragConnector>(() => {
  // port can be null for the so called global mode
  const portType = props.port ? availablePortTypes[props.port.typeId] : null;
  const flowVariableConnection = portType?.kind === "flowVariable";

  const fakeNode =
    props.nodeRelation === "SUCCESSORS" ? "sourceNode" : "destNode";
  const fakePort =
    props.nodeRelation === "SUCCESSORS" ? "sourcePort" : "destPort";

  return {
    id: `quick-add-${props.nodeId}-${portIndex.value}`,
    flowVariableConnection,
    absolutePoint: [props.position.x, props.position.y],
    allowedActions: { canDelete: false },
    interactive: false,
    // eslint-disable-next-line no-undefined
    [fakeNode]: props.nodeId ?? undefined,
    // eslint-disable-next-line no-undefined
    [fakePort]: portIndex.value ?? undefined,
  };
});

const marginTop = computed(() => {
  const ghostSizeZoomed = $shapes.addNodeGhostSize * zoomFactor.value;
  // eslint-disable-next-line no-magic-numbers
  const extraMargin = Math.log(ghostSizeZoomed) / 1.1;
  // eslint-disable-next-line no-magic-numbers
  const marginTop = ghostSizeZoomed / 2 + extraMargin + 3;

  return `${marginTop}px`;
});

const { port, nodeRelation } = toRefs(props);

const {
  menuMode,
  setQuickAddMode,
  setQuickBuildMode,
  isQuickBuildAvailableForPort,
} = useQuickActionMenu({ port, nodeRelation });

const { isKaiEnabled } = useIsKaiEnabled();
watch(
  isKaiEnabled,
  (enabled) => {
    if (!enabled && menuMode.value === "quick-build") {
      setQuickAddMode();
    }
  },
  {
    immediate: true, // do an initial check when the component is mounted
  },
);
</script>

<template>
  <FloatingMenu
    class="quick-add-node"
    :canvas-position="canvasPosition"
    aria-label="Quick add node"
    :anchor="nodeRelation === 'SUCCESSORS' ? 'top-left' : 'top-right'"
    focus-trap
    :prevent-overflow="true"
    :style="{ width: `${menuWidth}px` }"
    @menu-close="$emit('menuClose')"
  >
    <!-- this will be portalled to the canvas -->
    <NodePortActiveConnector
      v-if="hasConnector"
      :port="port"
      :direction="nodeRelation === 'SUCCESSORS' ? 'out' : 'in'"
      :drag-connector="fakePortConnector"
    />

    <div :class="['wrapper', menuMode]">
      <template v-if="menuMode == 'quick-add'">
        <QuickAddNodeMenu
          :node-id="nodeId"
          :port="port"
          :node-relation="nodeRelation"
          :canvas-position="canvasPosition"
          :port-index="portIndex"
          @menu-close="$emit('menuClose')"
        />
        <div v-if="isKaiEnabled && isQuickBuildAvailableForPort" class="footer">
          <Button primary @click="setQuickBuildMode">
            <AiIcon />
            Build with K-AI
          </Button>
        </div>
      </template>
      <KaiQuickBuild
        v-else-if="menuMode == 'quick-build'"
        :node-id="nodeId"
        :start-position="canvasPosition"
        @menu-back="setQuickAddMode"
      />
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-add-node {
  margin-top: v-bind("marginTop");

  & .wrapper {
    box-shadow: var(--shadow-elevation-1);
    background: var(--knime-gray-ultra-light);
    display: flex;
    flex-direction: column;
    border-radius: 8px;
    overflow: hidden;

    &.quick-add {
      height: 420px;
    }

    & .footer {
      flex: none;
      height: 46px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-top: 1px solid var(--knime-silver-sand);

      & button {
        height: 30px;
        padding: 0 15px;
        display: flex;
        align-items: center;
        font-size: 13px;
        font-weight: 500;
        line-height: 0.9;

        & svg {
          @mixin svg-icon-size 18;
        }
      }
    }
  }
}
</style>
