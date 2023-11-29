import type { Workflow } from "@/api/custom-types";
import type { EventTypes } from "./common";
import { toRaw } from "vue";
import type { XY } from "@/api/gateway-api/generated-api";

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

const createTree = (data: Workflow) => {
  const message: Message<Workflow> = { type: "create", payload: toRaw(data) };
  return sendMessage(message);
};

const nearest = (data: { workflow: Workflow; position: XY }) => {
  const message: Message<typeof data> = {
    type: "nearest",
    payload: {
      workflow: toRaw(data.workflow),
      position: data.position,
    },
  };

  return sendMessage<Array<[XY & { id: string }, number]>>(message);
};

export const workflowNavigationService = {
  createTree,
  nearest,
};
