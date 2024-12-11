import mitt, { type Emitter } from "mitt";

import type { DesktopAPIFunctionResultPayload } from "@/api/desktop-api";
import type { NodePort } from "@/api/gateway-api/generated-api";

import type { PluginInitFunction } from "./types";

export type PreviewMode = "show" | "hide" | "clear" | null;

export type SelectionPreviewEvents = {
  [key: `bendpoint-selection-preview-${string}__${string}`]: {
    index: number;
    preview: PreviewMode;
  };

  [key: `node-selection-preview-${string}`]: {
    id: string;
    preview: PreviewMode;
  };
};

type BusEvents = {
  "selection-pointerdown": PointerEvent;
  "selection-pointerup": PointerEvent;
  "selection-pointermove": PointerEvent;
  "selection-lostpointercapture": PointerEvent;

  "connector-start": {
    validConnectionTargets: Set<string>;
    startNodeId: string;
    startPort: NodePort;
  };
  "connector-dropped": undefined;
  "connector-end": undefined;

  [
    key: `desktop-api-function-result-${string}`
  ]: DesktopAPIFunctionResultPayload;

  "block-ui":
    | {
        darkenBackground?: boolean;
      }
    | undefined;
  "unblock-ui": undefined;
} & SelectionPreviewEvents;

const emitter = mitt<BusEvents>();

const clearAll = () => {
  emitter.all.clear();
};

export type EventBus = Omit<Emitter<BusEvents>, "all"> & {
  clearAll: typeof clearAll;
};

const $bus: EventBus = {
  on: emitter.on,
  off: emitter.off,
  emit: emitter.emit,
  clearAll,
};

export { $bus };

const init: PluginInitFunction = ({ app }) => {
  app.config.globalProperties.$bus = $bus;
};

export default init;
