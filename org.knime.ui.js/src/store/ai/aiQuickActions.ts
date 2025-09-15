import { computed, reactive } from "vue";
import { defineStore } from "pinia";

import type { Bounds } from "@/api/gateway-api/generated-api";
import { useAnnotationInteractionsStore } from "../workflow/annotationInteractions";

type GenerateAnnotationState =
  | { status: "idle"; bounds: null }
  | { status: "processing"; bounds: Bounds }; // can only contain bounds while processing

interface ActionsStates {
  generateAnnotation: GenerateAnnotationState;
}

export const useAiQuickActionsStore = defineStore("aiQuickActions", () => {
  const actionsStates = reactive<ActionsStates>({
    generateAnnotation: {
      status: "idle",
      bounds: null,
    },
  });
  const getStateForAction = <T extends keyof ActionsStates>(actionName: T) => {
    return computed(() => actionsStates[actionName]);
  };

  const generateAnnotation = async () => {
    if (actionsStates.generateAnnotation.status === "processing") {
      return;
    }

    const annotationInteractions = useAnnotationInteractionsStore();
    const capturedBounds =
      annotationInteractions.getAnnotationBoundsForSelectedNodes;

    // mark processing
    actionsStates.generateAnnotation = {
      status: "processing",
      bounds: capturedBounds,
    };

    // TODO AP-24796: replace with API.kai call once ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await annotationInteractions.addWorkflowAnnotation({
      // Use the bounds that were safely captured and stored in our own state.
      bounds: actionsStates.generateAnnotation.bounds,
      content: "<h5>Placeholder heading</h5><p>Placeholder text</p>",
    });

    // mark idle
    actionsStates.generateAnnotation = {
      status: "idle",
      bounds: null,
    };
  };

  return {
    // state tracking
    getStateForAction,

    // executable Quick AI actions
    generateAnnotation,
  };
});
