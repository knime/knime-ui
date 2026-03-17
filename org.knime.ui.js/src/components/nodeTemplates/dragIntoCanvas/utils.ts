import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";

import { KNIME_MIME } from "./constants";
import type { KnimeNodeDragEventData } from "./types";

export const isValidNodeTemplateDragEvent = (event: DragEvent) =>
  event.dataTransfer?.types.includes(KNIME_MIME);

export const setEventData = (
  event: DragEvent,
  nodeTemplate: NodeTemplateWithExtendedPorts,
) => {
  const isComponent = nodeTemplate.component;
  const dataTransferPayload: KnimeNodeDragEventData = isComponent
    ? {
        type: "component",
        payload: { id: nodeTemplate.id, name: nodeTemplate.name },
      }
    : { type: "node", payload: { nodeFactory: nodeTemplate.nodeFactory! } };

  event.dataTransfer!.setData("text/plain", nodeTemplate.id);
  event.dataTransfer!.setData(KNIME_MIME, JSON.stringify(dataTransferPayload));
};

export const getEventData = (event: DragEvent) => {
  const data = event.dataTransfer?.getData(KNIME_MIME);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as KnimeNodeDragEventData;
  } catch (error) {
    consola.error(
      "useDragNodeIntoCanvas:: Failed to parse drag event payload",
      { error },
    );

    return null;
  }
};
