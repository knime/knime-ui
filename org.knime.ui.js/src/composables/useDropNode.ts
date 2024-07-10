import { computed } from "vue";
import { useStore } from "./useStore";
import * as $shapes from "@/style/shapes.mjs";

export const useDropNode = () => {
  const KnimeMIME = "application/vnd.knime.ap.noderepo+json";
  const isKnimeNode = (event: DragEvent) =>
    event.dataTransfer.types.includes(KnimeMIME);

  const store = useStore();

  const isWritable = computed(() => store.getters["workflow/isWritable"]);

  const onDrop = async (event: DragEvent) => {
    if (isWritable.value) {
      const data = event.dataTransfer.getData(KnimeMIME);

      if (!data) {
        return;
      }

      const nodeFactory = JSON.parse(data);
      const [x, y] = store.getters["canvas/screenToCanvasCoordinates"]([
        event.clientX - $shapes.nodeSize / 2,
        event.clientY - $shapes.nodeSize / 2,
      ]);

      try {
        await store.dispatch("workflow/addNode", {
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
      event.dataTransfer.dropEffect = "copy";
    }
  };

  return {
    KnimeMIME,
    onDrop,
    onDragOver,
  };
};
