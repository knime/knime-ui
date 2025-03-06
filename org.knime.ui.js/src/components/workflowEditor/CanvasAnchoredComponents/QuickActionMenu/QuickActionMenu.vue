<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import { storeToRefs } from "pinia";

import { Button } from "@knime/components";
import AiIcon from "@knime/styles/img/icons/ai-general.svg";

import type { NodeRelation } from "@/api/custom-types";
import { type NodePort, type XY } from "@/api/gateway-api/generated-api";
import KaiQuickBuild from "@/components/kai/KaiQuickBuild.vue";
import { type QuickBuildMenuState } from "@/components/kai/KaiQuickBuild.vue";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { useApplicationStore } from "@/store/application/application";
import { useCanvasStore } from "@/store/canvas";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import * as $shapes from "@/style/shapes";
// TODO: refactor structure and implement fix for dynamically resolved NodePortActiveConnector
import type { DragConnector } from "../../SVGKanvas/ports/NodePort/types";
import NodePortActiveConnector from "../../SVGKanvas/ports/NodePortActiveConnector.vue";
import { useCanvasRendererUtils } from "../../util/canvasRenderer";
import { getFloatingMenuComponent } from "../getFloatingMenuComponent";

import QuickAddNodeMenu from "./quickAdd/QuickAddNodeMenu.vue";
import { useQuickActionMenu } from "./useQuickActionMenu";

const { FloatingMenu } = getFloatingMenuComponent();

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

const QUICK_BUILD_PROCESSING_OFFSET = 70;
const QUICK_BUILD_RESULT_OFFSET = -40;

defineEmits(["menuClose"]);

const { quickActionMenu } = storeToRefs(useCanvasAnchoredComponentsStore());
const { availablePortTypes } = storeToRefs(useApplicationStore());
const { zoomFactor } = storeToRefs(useCanvasStore());

const hasConnector = computed(() => quickActionMenu.value.hasConnector);

const { port, nodeRelation } = toRefs(props);

const {
  menuMode,
  setQuickAddMode,
  setQuickBuildMode,
  isQuickBuildModeAvailable,
} = useQuickActionMenu({ port, nodeRelation });

const quickBuildState = ref<QuickBuildMenuState>("INPUT");
const updateQuickBuildState = (newState: QuickBuildMenuState) =>
  (quickBuildState.value = newState);

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
  const portType = props.port
    ? availablePortTypes.value[props.port.typeId]
    : null;
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

const floatingMenuAnchor = computed(() => {
  if (menuMode.value === "quick-add") {
    return nodeRelation.value === "SUCCESSORS" ? "top-left" : "top-right";
  }

  if (quickBuildState.value === "INPUT") {
    return nodeRelation.value ? "top-left" : "top-right";
  }

  return "bottom-left";
});
const floatingMenuTopOffset = computed(() => {
  if (menuMode.value === "quick-build") {
    if (quickBuildState.value === "PROCESSING") {
      return QUICK_BUILD_PROCESSING_OFFSET;
    }

    if (quickBuildState.value === "RESULT") {
      return QUICK_BUILD_RESULT_OFFSET;
    }
  }

  return 0;
});

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

const { isSVGRenderer } = useCanvasRendererUtils();
</script>

<template>
  <FloatingMenu
    class="quick-add-node"
    :canvas-position="canvasPosition"
    aria-label="Quick add node"
    :anchor="floatingMenuAnchor"
    :top-offset="floatingMenuTopOffset"
    :focus-trap="quickActionMenu.isOpen"
    :prevent-overflow="true"
    @menu-close="$emit('menuClose')"
  >
    <!-- this will be portalled to the canvas -->
    <NodePortActiveConnector
      v-if="hasConnector && isSVGRenderer"
      :port="port"
      :direction="nodeRelation === 'SUCCESSORS' ? 'out' : 'in'"
      :drag-connector="fakePortConnector"
    />

    <div
      :class="['quick-action-content', menuMode]"
      :style="{ width: `${$shapes.quickActionMenuWidth}px` }"
    >
      <template v-if="menuMode == 'quick-add'">
        <QuickAddNodeMenu
          :node-id="nodeId"
          :port="port"
          :node-relation="nodeRelation"
          :canvas-position="canvasPosition"
          :port-index="portIndex"
          @menu-close="$emit('menuClose')"
        />
        <div v-if="isKaiEnabled && isQuickBuildModeAvailable" class="footer">
          <Button primary class="kai-button" @click="setQuickBuildMode">
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
        @quick-build-state-changed="updateQuickBuildState"
      />
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-add-node {
  margin-top: v-bind("marginTop");
}

.quick-action-content {
  box-shadow: var(--shadow-elevation-1);
  background: var(--knime-gray-ultra-light);
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;

  & .quick-add {
    height: 420px;
  }

  & .footer {
    margin-top: auto;
    flex: none;
    height: 46px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-top: 1px solid var(--knime-silver-sand);

    & .kai-button {
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
</style>
