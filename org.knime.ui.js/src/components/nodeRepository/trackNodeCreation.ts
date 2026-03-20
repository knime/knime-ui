import type { KnimeNode } from "@/api/custom-types";
import type { NodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { useAnalytics } from "@/services/analytics";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

export const trackNodeCreation = (
  action: "dblclick" | "enter" | "dragdrop",
  data: {
    newNodeId: string;
    template: NodeTemplateWithExtendedPorts;
    connectedTo?: { node: KnimeNode };
  },
) => {
  switch (action) {
    case "dblclick":
    case "enter": {
      // these 2 actions have the same payloads
      const trackIdMap = {
        dblclick: "node_created::noderepo_doubleclick_",
        enter: "node_created::noderepo_keyboard_enter",
      } as const;

      const trackId = trackIdMap[action];

      const connectedTo = data.connectedTo
        ? {
            nodeType: data.connectedTo.node.kind.toLowerCase(),
            nodeFactoryId: useNodeInteractionsStore().getNodeFactory(
              data.connectedTo.node.id,
            ).className,
          }
        : undefined;

      useAnalytics().track(trackId, {
        nodeType: "node",
        nodeFactoryId: data.template.nodeFactory!.className,
        connectedTo,
      });
      break;
    }

    case "dragdrop": {
      useAnalytics().track("node_created::noderepo_dragdrop_", {
        nodeType: "node",
        nodeFactoryId: data.template.nodeFactory!.className,
      });
    }
  }
};
