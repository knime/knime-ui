import { storeToRefs } from "pinia";

import { useCanvasStore } from "@/store/canvas";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $shapes from "@/style/shapes";

export const KNIME_MIME = "application/vnd.knime.ap.noderepo+json";

export const useDropNode = () => {
  const isKnimeNode = (event: DragEvent) =>
    event.dataTransfer?.types.includes(KNIME_MIME);

  const { isWritable } = storeToRefs(useWorkflowStore());
  const { screenToCanvasCoordinates } = storeToRefs(useCanvasStore());
  const { addNode } = useNodeInteractionsStore();

  const onDrop = async (event: DragEvent) => {
    if (isWritable.value) {
      const data = event.dataTransfer?.getData(KNIME_MIME);

      if (!data) {
        return;
      }

      const nodeFactory = JSON.parse(data);
      const [x, y] = screenToCanvasCoordinates.value([
        event.clientX - $shapes.nodeSize / 2,
        event.clientY - $shapes.nodeSize / 2,
      ]);

      try {
        await addNode({
          position: { x, y },
          nodeFactory,
        });
      } catch (error) {
        consola.error({ message: "Error adding node to workflow", error });
        throw error;
      }
    }

    // Default action when dropping links is to open them in your browser.
    event.preventDefault();
  };

  const onDragOver = (event: DragEvent) => {
    if (isWritable.value && isKnimeNode(event)) {
      event.dataTransfer!.dropEffect = "copy";
    }
  };

  return {
    onDrop,
    onDragOver,
  };
};
