import mitt, { type Emitter } from "mitt";

import type { DesktopAPIFunctionResultPayload } from "@/api/desktop-api";
import type { NodePort } from "@/api/gateway-api/generated-api";
import type {
  SnappedPlaceholderPort,
  SnappedPort,
} from "@/store/floatingConnector/types";

import type { PluginInitFunction } from "./types";

type SelectionRectangleEvents = {
  "selection-pointerdown": PointerEvent;
  "selection-pointerup": PointerEvent;
  "selection-pointermove": PointerEvent;
  "selection-lostpointercapture": PointerEvent;
};

type UIBlockingOverlayEvents = {
  "block-ui":
    | {
        darkenBackground?: boolean;
      }
    | undefined;
  "unblock-ui": undefined;
};

type PortConnectionEvents = {
  "connector-start": {
    validConnectionTargets: Set<string>;
    startNodeId: string;
    startPort: NodePort;
  };
  "connector-dropped": undefined;
  "connector-end": undefined;

  // connector-snap-<type>_<nodeId>__<portSide>__<portIndex>
  [
    key: `connector-snap-${"active" | "inactive"}_${string}__${
      | "in"
      | "out"}__${number}`
  ]: { snapTarget: SnappedPort };

  // connector-snap-<type>-placeholder_<nodeId>__<portSide>
  [
    key: `connector-snap-${"active" | "inactive"}-placeholder_${string}__${
      | "in"
      | "out"}`
  ]: { snapTarget: SnappedPlaceholderPort };
};

type DesktopAPIEvents = {
  [
    key: `desktop-api-function-result-${string}`
  ]: DesktopAPIFunctionResultPayload;
};

export type PreviewMode = "show" | "hide" | "clear" | null;

export type SelectionPreviewEvents = {
  [key: `node-selection-preview-${string}`]: {
    id: string;
    preview: PreviewMode;
  };

  [key: `annotation-selection-preview-${string}`]: {
    id: string;
    preview: PreviewMode;
  };
};

export type BusEvents = SelectionRectangleEvents &
  UIBlockingOverlayEvents &
  PortConnectionEvents &
  DesktopAPIEvents &
  SelectionPreviewEvents;

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
