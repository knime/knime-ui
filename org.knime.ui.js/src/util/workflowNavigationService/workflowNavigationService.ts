import { toRaw } from "vue";
import type { Workflow } from "@/api/custom-types";
import type { Direction, EventTypes, PointNode } from "./common";

const webWorker = new Worker(new URL("./worker", import.meta.url), {
  type: "module",
});

type Message<T> = { type: EventTypes; payload: T };

const sendMessage = <TResponse, TPayload = Record<string, any>>(
  message: Message<TPayload>,
) =>
  new Promise<TResponse>((resolve) => {
    webWorker.postMessage(message);

    // TODO: handle error messages
    webWorker.addEventListener("message", (event) => {
      resolve(event.data);
    });
  });

const nearest = (data: {
  workflow: Workflow;
  position: PointNode;
  direction: Direction;
}) => {
  const message: Message<typeof data> = {
    type: "nearest",
    payload: {
      workflow: toRaw(data.workflow),
      position: data.position,
      direction: data.direction,
    },
  };

  return sendMessage<PointNode>(message);
};

export const workflowNavigationService = {
  nearest,
};
