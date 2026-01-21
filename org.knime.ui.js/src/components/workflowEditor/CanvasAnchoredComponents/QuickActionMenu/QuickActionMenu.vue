<script setup lang="ts">
/*
Quick Action Menu has the following modes:
- Quick Node Insertion (aka Quick Node Add) mode: allows searching the node repository and instantly adding the selected node;
- Quick Build mode: allows prompting K-AI with a workflow-building request.

On drag of node port or double-click on canvas, the menu will open in the mode it was last opened in.

On cmd/ctrl + . the menu will open in Quick Node Insertion mode.
On cmd/ctrl + shift + . the menu will open in Quick Build mode.
*/
import { computed, ref, toRefs } from "vue";
import { storeToRefs } from "pinia";

import { FunctionButton } from "@knime/components";
import { KdsValueSwitch } from "@knime/kds-components";
import CancelIcon from "@knime/styles/img/icons/cancel-execution.svg";

import type { NodeRelation } from "@/api/custom-types";
import { type NodePort, type XY } from "@/api/gateway-api/generated-api";
import { QuickAddComponentMenu } from "@/components/componentSearch";
import KaiQuickBuild from "@/components/kai/KaiQuickBuild.vue";
import QuickAddNodeMenu from "@/components/nodeSearch/quickAdd/QuickAddNodeMenu.vue";
import { useApplicationStore } from "@/store/application/application";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useCanvasAnchoredComponentsStore } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import * as $shapes from "@/style/shapes";
import type { DragConnector } from "../../SVGKanvas/ports/NodePort/types";
import NodePortActiveConnector from "../../SVGKanvas/ports/NodePortActiveConnector.vue";
import { useCanvasRendererUtils } from "../../util/canvasRenderer";
import { getFloatingMenuComponent } from "../getFloatingMenuComponent";

import {
  type QuickActionMenuAnchor,
  type QuickActionMenuContentHeight,
  type QuickActionMenuContext,
} from "./types";
import { useQuickActionMenuMode } from "./useQuickActionMenuMode";

const { FloatingMenu } = getFloatingMenuComponent();

export type QuickActionMenuMode = "quick-add" | "quick-build" | null;

export type QuickActionMenuProps = {
  nodeId?: string | null;
  position: XY;
  port?: NodePort | null;
  nodeRelation?: NodeRelation | null;
  // required for recalculation of the position if opened with key shortcuts
  positionOrigin?: "mouse" | "calculated";
  initialMode?: QuickActionMenuMode;
};

const props = withDefaults(defineProps<QuickActionMenuProps>(), {
  nodeId: null,
  port: null,
  nodeRelation: null,
  positionOrigin: "mouse",
  initialMode: null,
});

const emit = defineEmits(["menuClose"]);

const { quickActionMenu } = storeToRefs(useCanvasAnchoredComponentsStore());
const { availablePortTypes } = storeToRefs(useApplicationStore());

const hasConnector = computed(() => quickActionMenu.value.hasConnector);

const { port, nodeRelation } = toRefs(props);

const { activeMode, availableModes } = useQuickActionMenuMode({
  port,
  nodeRelation,
});

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

const { isSVGRenderer, isWebGLRenderer } = useCanvasRendererUtils();

const marginTop = computed(() => {
  if (isWebGLRenderer.value) {
    // eslint-disable-next-line no-magic-numbers
    return 4; // --space-4 not yet defined in js
  }
  const ghostSizeZoomed =
    $shapes.addNodeGhostSize * useSVGCanvasStore().zoomFactor;
  // eslint-disable-next-line no-magic-numbers
  const extraMargin = Math.log(ghostSizeZoomed) / 1.1;
  // eslint-disable-next-line no-magic-numbers
  const marginTop = ghostSizeZoomed / 2 + extraMargin + 3;

  return marginTop;
});

type MenuStyleConfig = {
  height: QuickActionMenuContentHeight;
  topOffset: number;
  anchor: QuickActionMenuAnchor;
};

const defaultStyleConfig: MenuStyleConfig = Object.freeze({
  height: "auto",
  topOffset: 0,
  anchor: "top-left",
});

const menuStyleConfig = ref<MenuStyleConfig>({ ...defaultStyleConfig });

const context = computed<QuickActionMenuContext>(() => ({
  nodeId: props.nodeId,
  port: port.value,
  nodeRelation: nodeRelation.value,
  canvasPosition: canvasPosition.value,
  updateMenuStyle: (newConfig) => {
    menuStyleConfig.value = {
      ...defaultStyleConfig,
      ...newConfig,
    };
  },
  closeMenu: () => emit("menuClose"),
}));

const resetMenuStyleConfig = () => {
  menuStyleConfig.value = defaultStyleConfig;
};
</script>

<template>
  <FloatingMenu
    :canvas-position="canvasPosition"
    aria-label="Quick Action menu"
    :anchor="menuStyleConfig.anchor"
    :top-offset="menuStyleConfig.topOffset"
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
      class="quick-action-content"
      :style="{
        width: `${$shapes.quickActionMenuWidth}px`,
        'margin-top': `${marginTop}px`,
        height: menuStyleConfig.height,
      }"
    >
      <div class="mode-switcher">
        <KdsValueSwitch
          v-model="activeMode"
          data-test-id="mode-switcher"
          size="small"
          :possible-values="availableModes"
          @update:model-value="resetMenuStyleConfig"
        />

        <FunctionButton
          class="close-menu-btn"
          compact
          @click="$emit('menuClose')"
        >
          <CancelIcon />
        </FunctionButton>
      </div>

      <QuickAddNodeMenu
        v-if="activeMode === 'nodes'"
        :quick-action-context="context"
      />

      <QuickAddComponentMenu
        v-if="activeMode === 'components'"
        :quick-action-context="context"
      />

      <KaiQuickBuild
        v-if="activeMode === 'k-ai'"
        :quick-action-context="context"
      />
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.quick-action-content {
  box-shadow: var(--shadow-elevation-1);
  background: var(--knime-gray-ultra-light);
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;

  & .mode-switcher {
    padding: 10px 10px 0;
    display: flex;
    align-items: center;

    & .close-menu-btn {
      margin-left: auto;
    }
  }

  & .footer {
    margin-top: auto;
    flex: none;
    height: 46px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-top: 1px solid var(--knime-silver-sand);
  }
}
</style>
