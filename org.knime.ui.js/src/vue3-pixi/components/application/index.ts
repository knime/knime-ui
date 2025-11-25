/* eslint-disable no-undefined */
/* eslint-disable func-style */
/* eslint-disable vue/one-component-per-file */
import { Application as _Application } from "pixi.js";
import type {
  ColorSource,
  Container,
  GpuPowerPreference,
  WebGLOptions,
  WebGPUOptions,
} from "pixi.js";
import {
  defineComponent,
  getCurrentInstance,
  h,
  markRaw,
  onMounted,
  onUnmounted,
  ref,
  renderSlot,
  toRef,
  toRefs,
  watch,
} from "vue";
import type { App, PropType } from "vue";

import { createApp } from "../../renderer";
import { inheritParent } from "../../utils";

export interface ApplicationInst {
  canvas: HTMLCanvasElement;
  app: _Application;
}

export const Application = defineComponent({
  props: {
    antialias: { type: Boolean, default: undefined },
    autoDensity: { type: Boolean, default: undefined },
    autoStart: { type: Boolean, default: true },
    alpha: { type: Boolean, default: undefined },
    backgroundColor: {
      type: [Number, String, Array, Object] as PropType<ColorSource>,
      default: "white",
    },
    backgroundAlpha: { type: Number, default: 1 },
    clearBeforeRender: { type: Boolean, default: undefined },
    hello: { type: Boolean, default: undefined },
    textureGCActive: { type: Boolean, default: undefined },
    textureGCAMaxIdle: { type: Number, default: undefined },
    textureGCCheckCountMax: { type: Number, default: undefined },
    bezierSmoothness: { type: Number, default: undefined },
    premultipliedAlpha: { type: Boolean, default: undefined },
    preserveDrawingBuffer: { type: Boolean, default: undefined },
    forceFallbackAdapter: { type: Boolean, default: undefined },
    depth: { type: Boolean, default: undefined },
    failIfMajorPerformanceCaveat: { type: Boolean, default: undefined },
    powerPreference: {
      type: String as PropType<GpuPowerPreference>,
      default: undefined,
    },
    resizeTo: {
      type: Function as PropType<() => HTMLElement | Window | undefined>,
      default: undefined,
    },
    transferControlToOffscreen: Boolean,
    roundPixels: { type: Boolean, default: undefined },
    useBackBuffer: { type: Boolean, default: undefined },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
    resolution: { type: Number, default: 1 },

    preference: {
      type: String as PropType<"webgl" | "webgpu">,
      default: undefined,
    },
    /** Optional WebGPUOptions to pass only to WebGPU renderer. */
    webgpu: {
      type: Object as PropType<Partial<WebGPUOptions>>,
      default: undefined,
    },
    /** Optional WebGLOptions to pass only to the WebGL renderer */
    webgl: {
      type: Object as PropType<Partial<WebGLOptions>>,
      default: undefined,
    },
    onBeforeMount: {
      type: Function as PropType<(app: ApplicationInst["app"]) => void>,
      default: undefined,
    },
  },
  emits: ["initComplete"],
  setup(props, { slots, expose, emit }) {
    const { appContext } = getCurrentInstance()!;
    const canvas = ref<HTMLCanvasElement>();
    const pixiApp = ref<_Application>();

    let app: App<Container> | undefined;

    async function mount() {
      let view: HTMLCanvasElement | OffscreenCanvas | undefined = canvas.value;
      if (props.transferControlToOffscreen) {
        view = canvas.value?.transferControlToOffscreen() as OffscreenCanvas;
      }

      const inst = new _Application();
      await inst.init({ canvas: view, ...props, resizeTo: props.resizeTo?.() });

      pixiApp.value = markRaw(inst);

      const { width, height } = toRefs(props);
      watch([width, height], () => {
        const newWidth = props.width ?? inst.renderer.width;
        const newHeight = props.height ?? inst.renderer.height;
        inst.renderer.resize(
          newWidth,
          newHeight,
          props.resolution ?? inst.renderer.resolution,
        );
      });

      app = createApp({ render: renderSlotDefault });

      inheritParent(app, appContext);

      if (props.onBeforeMount) {
        props.onBeforeMount(pixiApp.value);
      }

      app.mount(pixiApp.value.stage);

      emit("initComplete");
    }
    function unmount() {
      app?.unmount();
      app = undefined;

      pixiApp.value?.destroy(true, true);
      pixiApp.value = undefined;
    }

    function renderSlotDefault() {
      return renderSlot(slots, "default");
    }

    function renderCanvas() {
      return h("canvas", { ref: canvas });
    }

    onMounted(mount);
    onUnmounted(unmount);

    expose({ canvas, app: pixiApp });

    return renderCanvas;
  },
});
