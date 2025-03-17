import type { FederatedPointerEvent } from "pixi.js";

import { getMetaOrCtrlKey } from "@knime/utils";

export const isMultiselectEvent = (
  event: MouseEvent | PointerEvent | FederatedPointerEvent,
) => event.shiftKey || event[getMetaOrCtrlKey()];
