import { toRaw } from "vue";
import type { FindNearestObjectPayload, WorkerMessage } from "./common";
import type { WorkflowObject } from "@/api/custom-types";

const webWorker = new Worker(new URL("./worker", import.meta.url), {
  type: "module",
});

/**
 * Helper to wrap message passing to and from a WebWorker in a promise, for
 * easier consumption
 * @param message
 * @returns
 */
const sendMessage = <TResponse, TPayload = Record<string, any>>(
  message: WorkerMessage<TPayload>,
) =>
  new Promise<TResponse>((resolve, reject) => {
    webWorker.postMessage(message);

    webWorker.addEventListener("message", (event) => {
      resolve(event.data);
    });

    webWorker.addEventListener("error", (event) => {
      consola.error("Error finding nearest object", event);
      reject(event.error);
    });
  });

/**
 * Find the nearest obeject (node or annotation) in the workflow with respect
 * to the given reference object and the given (general) direction. This direction
 * will be treated as a kind of cone of action that starts (and grows) from the
 * reference object and points to the corresponding direction.
 *
 * @param data
 * @returns The object that was found.
 */
const nearestObject = (data: FindNearestObjectPayload) => {
  const message: WorkerMessage<FindNearestObjectPayload> = {
    type: "nearest",
    payload: {
      // remove reactive proxies to keep the objects simpler
      objects: toRaw(data.objects),
      reference: toRaw(data.reference),
      direction: data.direction,
    },
  };

  return sendMessage<WorkflowObject | undefined>(message);
};

export const workflowNavigationService = { nearestObject };
