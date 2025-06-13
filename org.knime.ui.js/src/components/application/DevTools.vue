<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from "vue";
import { useWindowSize } from "@vueuse/core";

import { FunctionButton, ValueSwitch } from "@knime/components";
import ChartDotsIcon from "@knime/styles/img/icons/chart-dots.svg";
import CodeHtmlIcon from "@knime/styles/img/icons/code-html.svg";
import ReloadIcon from "@knime/styles/img/icons/reload.svg";

import { isDesktop } from "@/environment";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { clamp } from "@/util/clamp";
import { openInspector, reloadApp } from "@/util/devTools";
import FPSMeter from "../toolbar/FPSMeter.vue";
import {
  type CanvasRendererType,
  useCanvasRendererUtils,
} from "../workflowEditor/util/canvasRenderer";

const isFrontendDevMode = import.meta.env.DEV;
const { currentRenderer, isSVGRenderer } = useCanvasRendererUtils();
const canvasRenderers: CanvasRendererType[] = ["SVG", "WebGL"];
const webglCanvasStore = useWebGLCanvasStore();

const wrapper = useTemplateRef("wrapper");
const handle = useTemplateRef("handle");
const positionStyle = ref({ left: 0, top: 0 });
const { width: windowWidth, height: windowHeight } = useWindowSize();
let cachedWrapperRect: DOMRect;

onMounted(() => {
  const BOTTOM_POSITION_PADDING = 16;
  cachedWrapperRect = wrapper.value!.getBoundingClientRect();

  // set initial position to be bottom/center of the screen
  positionStyle.value.left =
    windowWidth.value / 2 - cachedWrapperRect.width / 2;
  positionStyle.value.top =
    windowHeight.value - cachedWrapperRect.height - BOTTOM_POSITION_PADDING;
});

const updatePosition = (params: { newLeft: number; newTop: number }) => {
  const { newLeft, newTop } = params;
  positionStyle.value = {
    left: clamp(newLeft, 0, windowWidth.value - cachedWrapperRect.width),
    top: clamp(newTop, 0, windowHeight.value - cachedWrapperRect.height),
  };
};

watch([windowWidth, windowHeight], () => {
  // make sure current position doesn't go out of window bounds
  updatePosition({
    newLeft: positionStyle.value.left,
    newTop: positionStyle.value.top,
  });
});

const dragStart = (pointerDown: PointerEvent) => {
  const target = pointerDown.target as HTMLElement;
  target.setPointerCapture(pointerDown.pointerId);
  const { clientX: startX, clientY: startY } = pointerDown;
  const { x, y } = handle.value!.getBoundingClientRect();
  const clickDelta = { x: startX - x, y: startY - y };

  const onMove = (pointerMove: PointerEvent) => {
    const { clientX, clientY } = pointerMove;
    const newLeft = clientX - clickDelta.x;
    const newTop = clientY - clickDelta.y;
    updatePosition({ newLeft, newTop });
  };

  const onUp = () => {
    target.releasePointerCapture(pointerDown.pointerId);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
};
</script>

<template>
  <div
    ref="wrapper"
    class="dev-tools"
    :style="{
      left: positionStyle.left + 'px',
      top: positionStyle.top + 'px',
    }"
  >
    <div ref="handle" class="handle" title="Drag" @pointerdown="dragStart">
      ⠿
    </div>

    <div class="content">
      <div class="buttons">
        <FunctionButton
          v-if="isDesktop()"
          class="header-button no-text"
          data-test-id="browser-devtools"
          title="Inspect Code (DEV MODE ONLY)"
          @click="openInspector()"
        >
          <CodeHtmlIcon aria-hidden="true" focusable="false" />
        </FunctionButton>

        <FunctionButton
          v-if="isFrontendDevMode"
          class="header-button no-text"
          data-test-id="reload-app"
          title="Reload App (DEV MODE ONLY)"
          @click="reloadApp()"
        >
          <ReloadIcon aria-hidden="true" focusable="false" />
        </FunctionButton>
      </div>

      <ValueSwitch
        v-if="isFrontendDevMode"
        v-model="currentRenderer"
        compact
        data-test-id="canvas-renderer-toggler"
        class="canvas-toggler"
        :possible-values="
          canvasRenderers.map((value) => ({ id: value, text: value }))
        "
      />

      <FunctionButton
        :disabled="isSVGRenderer"
        class="header-button no-text control"
        aria-label="Toggle canvas debug"
        data-test-id="canvas-debug-btn"
        title="Toggle canvas debug"
        @click="
          webglCanvasStore.isDebugModeEnabled =
            !webglCanvasStore.isDebugModeEnabled
        "
      >
        <ChartDotsIcon />
      </FunctionButton>

      <FPSMeter />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.dev-tools {
  position: fixed;
  bottom: 16px;
  display: flex;
  align-items: center;
  height: 40px;
  box-shadow: var(--shadow-elevation-1);
  background: var(--knime-gray-ultra-light);
  border: 1px solid var(--knime-silver-sand);
  border-radius: 4px;
  z-index: v-bind("$zIndices.layerPriorityElevation");

  & .handle {
    width: 20px;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: grab;
    user-select: none;
    padding-top: var(--space-4);
  }

  & .content,
  & .content .buttons {
    display: flex;
    align-items: center;
  }

  & .content {
    padding: var(--space-8);
    gap: var(--space-6);
  }
}
</style>
