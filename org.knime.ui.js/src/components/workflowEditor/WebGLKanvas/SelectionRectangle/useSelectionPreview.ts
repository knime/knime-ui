import { computed, ref } from "vue";

import { useGlobalBusListener } from "@/composables/useGlobalBusListener";
import {
  type PreviewMode,
  type SelectionPreviewEvents,
} from "@/plugins/event-bus";

type UseSelectionPreviewOptions = {
  objectId: string;
  eventNameResolver: () => keyof SelectionPreviewEvents;
  isObjectSelected: (id: string) => boolean;
};

export const useSelectionPreview = (options: UseSelectionPreviewOptions) => {
  const selectionPreview = ref<PreviewMode>(null);

  const isSelectionPreviewShown = computed(() => {
    // no preview
    if (selectionPreview.value === null) {
      return options.isObjectSelected(options.objectId);
    }
    // preview can override selected state (think: deselect with shift)
    if (
      options.isObjectSelected(options.objectId) &&
      selectionPreview.value === "hide"
    ) {
      return false;
    }
    return (
      selectionPreview.value === "show" ||
      options.isObjectSelected(options.objectId)
    );
  });

  const eventName = options.eventNameResolver();

  useGlobalBusListener({
    eventName,
    handler: (event) => {
      selectionPreview.value = event.preview;
    },
  });

  return { selectionPreview, isSelectionPreviewShown };
};
