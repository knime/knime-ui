/* eslint-disable func-style */
import type { XY } from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import type { SelectionMode } from "@/store/selection/types";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";

import type { ObjectMetadata } from "./types";

export const useObjectHandler = (objectMetadata: ObjectMetadata) => {
  const selectionStore = useSelectionStore();

  type HandlersApi = {
    getObjectId: () => string;
    isObjectSelected: () => boolean;
    selectObject: (mode?: SelectionMode) => void;
    deselectObject: () => void;
    /**
     * Needed for grid snapping. Not used by objects that do not snap to grid
     */
    getObjectInitialPosition?: () => XY;
  };

  function assertUnreachable(_: never): never {
    throw new Error("Exhaustive check not met");
  }

  // eslint-disable-next-line consistent-return
  const setup = (): HandlersApi => {
    switch (objectMetadata.type) {
      case "node": {
        return {
          getObjectId: () => objectMetadata.nodeId,
          isObjectSelected: () =>
            selectionStore.isNodeSelected(objectMetadata.nodeId),
          selectObject: (mode) =>
            selectionStore.selectNodes([objectMetadata.nodeId], mode),
          deselectObject: () =>
            selectionStore.deselectNodes([objectMetadata.nodeId]),
          getObjectInitialPosition: () => {
            const node = useNodeInteractionsStore().getNodeById(
              objectMetadata.nodeId,
            );
            return node!.position;
          },
        };
      }

      case "annotation": {
        return {
          getObjectId: () => objectMetadata.annotationId,
          isObjectSelected: () =>
            selectionStore.isAnnotationSelected(objectMetadata.annotationId),
          selectObject: () =>
            selectionStore.selectAnnotations([objectMetadata.annotationId]),
          deselectObject: () =>
            selectionStore.deselectAnnotations([objectMetadata.annotationId]),
          getObjectInitialPosition: () => {
            const annotation =
              useAnnotationInteractionsStore().getAnnotationById(
                objectMetadata.annotationId,
              );
            return { x: annotation!.bounds.x, y: annotation!.bounds.y };
          },
        };
      }

      case "bendpoint": {
        return {
          getObjectId: () => objectMetadata.bendpointId,
          isObjectSelected: () =>
            selectionStore.isBendpointSelected(objectMetadata.bendpointId),
          selectObject: () =>
            selectionStore.selectBendpoints(objectMetadata.bendpointId),
          deselectObject: () =>
            selectionStore.deselectBendpoints(objectMetadata.bendpointId),
        };
      }

      case "componentPlaceholder": {
        return {
          getObjectId: () => objectMetadata.placeholderId,
          isObjectSelected: () =>
            selectionStore.getSelectedComponentPlaceholder?.id ===
            objectMetadata.placeholderId,
          selectObject: () =>
            selectionStore.selectComponentPlaceholder(
              objectMetadata.placeholderId,
            ),
          deselectObject: () => selectionStore.deselectComponentPlaceholder(),
        };
      }

      case "portbar": {
        return {
          getObjectId: () => objectMetadata.containerId,
          isObjectSelected: () =>
            selectionStore.isMetaNodePortBarSelected(objectMetadata.side),
          selectObject: () =>
            selectionStore.selectMetanodePortBar(objectMetadata.side),
          deselectObject: () =>
            selectionStore.deselectMetanodePortBar(objectMetadata.side),
        };
      }

      default:
        assertUnreachable(objectMetadata);
    }
  };

  return setup();
};
