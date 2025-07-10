/* eslint-disable no-undefined */
/* eslint-disable no-magic-numbers */
import { nextTick } from "vue";
import { Rectangle } from "pixi.js";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useSelectionStore } from "@/store/selection";
import { generateSvgAsString } from "../../util/generateSvgAsString";

/**
 * Generates a SVG file with an base64 WebP <image> as preview for webgl canvas
 * @param isEmpty
 * @returns svg string
 */
export const generateWorkflowPreview = async (isEmpty: boolean) => {
  if (isEmpty) {
    const svgNS = "http://www.w3.org/2000/svg";
    const emptySvg = document.createElementNS(svgNS, "svg");
    return generateSvgAsString(emptySvg);
  }

  const webglCanvasStore = useWebGLCanvasStore();
  if (!webglCanvasStore.pixiApplication) {
    return null;
  }

  // change state for the snapshot
  webglCanvasStore.shouldHideMiniMap = true;
  useSelectionStore().shouldHideSelection = true;
  await nextTick();

  // stop update the visible app
  const app = webglCanvasStore.pixiApplication.app;
  app.ticker.stop();

  const state = webglCanvasStore.getCanvasScrollState;
  // just required to prevent culling the extract system does not honor offset and scale
  webglCanvasStore.fitToScreen();

  // this is the real size including everything on the stage and with no scaling/offset
  const localBounds = app.stage.getLocalBounds();

  // limit image size raw to 256 MB - the limit in chrome/CEF seems to be around 512MB
  const maxBuffer = 256 * 1024 * 1024;
  const isOversized = 4 * localBounds.width * localBounds.height > maxBuffer;
  const maxSize = Math.sqrt(maxBuffer / 4);

  const width = Math.floor(Math.min(maxSize, localBounds.width));
  const height = Math.floor(Math.min(maxSize, localBounds.height));
  const resolution = isOversized ? 1 : 2;

  // limit the width and height for oversized images
  const frame = isOversized ? new Rectangle(0, 0, width, height) : undefined;

  const base64 = await app.renderer.extract.base64({
    format: "webp",
    frame,
    resolution,
    quality: 0.9,
    target: app.stage,
  });

  useSelectionStore().shouldHideSelection = false;
  webglCanvasStore.shouldHideMiniMap = false;
  // if the app is gone we do not restore any state
  if (app.ticker) {
    webglCanvasStore.restoreScrollState(state);
    // start the regular app again
    app.ticker?.start();
  }

  const svgNS = "http://www.w3.org/2000/svg";
  const webGlImageEmbeddingSvg = document.createElementNS(svgNS, "svg");
  webGlImageEmbeddingSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  // required for the hub
  webGlImageEmbeddingSvg.setAttribute("width", width.toString());
  webGlImageEmbeddingSvg.setAttribute("height", height.toString());
  const img = document.createElementNS(svgNS, "image");

  img.setAttribute("width", width.toString());
  img.setAttribute("height", height.toString());
  img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", base64);
  webGlImageEmbeddingSvg.appendChild(img);

  return generateSvgAsString(webGlImageEmbeddingSvg);
};
