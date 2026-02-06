import { type Ref, computed } from "vue";
import { storeToRefs } from "pinia";

import type { KnimeNode, PlaceholderConnectionType } from "@/api/custom-types";
import {
  type ComponentNode,
  ComponentPlaceholder,
  type MetaNode,
  type NativeNode,
  Node,
  type XY,
} from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import { useMovingStore } from "@/store/workflow/moving";
import { useWorkflowStore } from "@/store/workflow/workflow";
import portShift, { getPortPositionInNode } from "@/util/portShift";

type UsePlaceholderConnectorPositionOptions = {
  sourceNode: Ref<string>;
  destNode: Ref<string>;
  sourcePort: Ref<number>;
  destPort: Ref<number>;
  placeholderType: Ref<PlaceholderConnectionType>;
};

type SourceOrDest = "source" | "dest";

type ConnectedNodeObject =
  | { type: Node.KindEnum.Node; payload: NativeNode }
  | { type: Node.KindEnum.Component; payload: ComponentNode }
  | { type: Node.KindEnum.Metanode; payload: MetaNode }
  | { type: "placeholder"; payload: ComponentPlaceholder };

export const usePlaceholderConnectorPosition = (
  options: UsePlaceholderConnectorPositionOptions,
) => {
  const { activeWorkflow } = storeToRefs(useWorkflowStore());
  const { movePreviewDelta } = storeToRefs(useMovingStore());
  const selectionStore = useSelectionStore();

  const nodeToConnectedNodeObject = (node: KnimeNode): ConnectedNodeObject => {
    if (node.kind === Node.KindEnum.Node) {
      return { type: Node.KindEnum.Node, payload: node as NativeNode };
    } else if (node.kind === Node.KindEnum.Component) {
      return { type: Node.KindEnum.Component, payload: node as ComponentNode };
    } else {
      return { type: Node.KindEnum.Metanode, payload: node as MetaNode };
    }
  };

  const { isNodeSelected } = selectionStore;
  const isSourceNodeSelected = computed(
    () =>
      options.placeholderType.value === "placeholder-in" &&
      isNodeSelected(options.sourceNode.value ?? ""),
  );
  const isDestNodeSelected = computed(
    () =>
      options.placeholderType.value === "placeholder-out" &&
      isNodeSelected(options.destNode.value ?? ""),
  );

  const sourceNodeObject = computed(() => {
    if (options.placeholderType?.value === "placeholder-out") {
      const placeholder = activeWorkflow.value?.componentPlaceholders?.find(
        ({ id }) => id === options.sourceNode.value,
      );

      return placeholder
        ? ({
            type: "placeholder",
            payload: placeholder,
          } satisfies ConnectedNodeObject)
        : null;
    }

    const node = activeWorkflow.value?.nodes[options.sourceNode.value];
    return node ? nodeToConnectedNodeObject(node) : null;
  });

  const destNodeObject = computed(() => {
    if (options.placeholderType?.value === "placeholder-in") {
      const placeholder = activeWorkflow.value?.componentPlaceholders?.find(
        ({ id }) => id === options.destNode.value,
      );

      return placeholder
        ? ({
            type: "placeholder",
            payload: placeholder,
          } satisfies ConnectedNodeObject)
        : null;
    }

    const node = activeWorkflow.value?.nodes[options.destNode.value];
    return node ? nodeToConnectedNodeObject(node) : null;
  });

  const getEndPointCoordinates = (type: SourceOrDest = "dest"): XY => {
    const reference = type === "source" ? sourceNodeObject : destNodeObject;
    const referenceId =
      type === "source" ? options.sourceNode : options.destNode;

    const referencePortIndex =
      type === "source" ? options.sourcePort : options.destPort;

    if (
      !reference.value ||
      !referenceId.value ||
      referencePortIndex.value === null
    ) {
      consola.warn(
        "Invalid state. No reference identifiers found to determine placeholder connector position",
      );
      return { x: 0, y: 0 };
    }

    if (reference.value.type === "placeholder") {
      const [dx, dy] = portShift(
        1,
        2,
        false,
        options.placeholderType.value === "placeholder-out",
      );

      return {
        x: reference.value.payload.position.x + dx,
        y: reference.value.payload.position.y + dy,
      };
    } else {
      return getPortPositionInNode(
        referencePortIndex.value,
        type,
        reference.value.payload,
      );
    }
  };

  const start = computed<XY>(() => {
    const { x, y } = getEndPointCoordinates("source");

    if (!isSourceNodeSelected.value) {
      return { x, y };
    }

    return {
      x: x + movePreviewDelta.value.x,
      y: y + movePreviewDelta.value.y,
    };
  });

  const end = computed<XY>(() => {
    const { x, y } = getEndPointCoordinates("dest");

    if (!isDestNodeSelected.value) {
      return { x, y };
    }

    return {
      x: x + movePreviewDelta.value.x,
      y: y + movePreviewDelta.value.y,
    };
  });

  return {
    start,
    end,
  };
};
