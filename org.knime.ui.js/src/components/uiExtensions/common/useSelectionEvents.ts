import type { UIExtensionPushEvents } from "@knime/ui-extension-renderer/api";

import { SelectionEvent } from "@/api/gateway-api/generated-api";

type SelectionEventListener = (
  event: UIExtensionPushEvents.PushEvent<"SelectionEvent", SelectionEvent>,
) => void;

type SelectionEventId = {
  projectId: string;
  workflowId: string;
  nodeId: string;
};
const listeners = new Map<string, SelectionEventListener>();

const composeId = (id: SelectionEventId): string => {
  return `${id.projectId}${id.workflowId}${id.nodeId}`;
};

export const useSelectionEvents = () => {
  return {
    addListener: (id: SelectionEventId, listener: SelectionEventListener) => {
      listeners.set(composeId(id), listener);
    },
    removeListener: (id: SelectionEventId) => {
      listeners.delete(composeId(id));
    },
    notifyListeners: (event: SelectionEvent) => {
      const listener = listeners.get(composeId(event));
      listener?.({
        eventType: "SelectionEvent",
        // @ts-expect-error (please add error description)
        payload: {
          ...event,
        },
      });
    },
  };
};
