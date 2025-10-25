import { computed, readonly, ref } from "vue";
import type { Ref } from "vue";

import type { WorkflowObject } from "@/api/custom-types";
import { canvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";
import { useWorkflowStore } from "@/store/workflow/workflow";

import type { SelectionMode } from "./types";
import { useStateWithPreview } from "./utils";

type UseAnnotationSelectionOptions = {
  focusedObject: Ref<WorkflowObject | null>;
  shouldHideSelection: Ref<boolean>;
};

export const useAnnotationSelection = (
  options: UseAnnotationSelectionOptions,
) => {
  const { shouldHideSelection, focusedObject } = options;
  const workflowStore = useWorkflowStore();

  const {
    committedSelection,
    previewSelection,
    hasUncommittedSelection,
    updatePreview,
    commitSelection,
  } = useStateWithPreview();

  /**
   * List of selected annotation ids. Defaults to `committed` selection.
   */
  const selectedAnnotationIds = computed(() => [
    ...committedSelection.values(),
  ]);

  /**
   * List of selected annotations. Defaults to `committed` selection.
   */
  const getSelectedAnnotations = computed(() => {
    return workflowStore.activeWorkflow
      ? workflowStore.activeWorkflow.workflowAnnotations.filter(({ id }) =>
          committedSelection.has(id),
        )
      : [];
  });

  /**
   * When only one annotation is selected, return it; otherwise `null`. Doesn't account
   * for other types of objects in the selection (e.g nodes)
   * Defaults to `committed` selection.
   */
  const singleSelectedAnnotation = computed(() => {
    return getSelectedAnnotations.value.length === 1
      ? getSelectedAnnotations.value[0]
      : null;
  });

  /**
   * @deprecated only used for SVG canvas.
   */
  const startedSelectionFromAnnotationId = ref<string | null>(null);
  /**
   * @deprecated only used for SVG canvas.
   */
  const didStartRectangleSelection = ref(false);

  const setAnnotationSelection = (
    annotationIds: string[],
    mode: SelectionMode = "committed",
  ) => {
    const newSelected: Record<string, boolean> = Object.fromEntries(
      annotationIds.map((id) => [id, true]),
    );

    updatePreview(newSelected);

    if (mode === "committed") {
      commitSelection();
    }
  };

  /**
   * @deprecated only used for SVG canvas.
   */
  const toggleAnnotationSelection = ({
    annotationId,
    isMultiselect,
    isSelected,
  }: {
    annotationId: string;
    isMultiselect: boolean;
    isSelected: boolean;
  }) => {
    if (canvasRendererUtils.isWebGLRenderer()) {
      throw new Error(
        "Implementation error: please don't use this action on the WebGL canvas",
      );
    }

    if (
      annotationId === startedSelectionFromAnnotationId.value &&
      didStartRectangleSelection.value
    ) {
      startedSelectionFromAnnotationId.value = null;
      return;
    }

    if (!isMultiselect) {
      previewSelection.clear();
      committedSelection.clear();
      previewSelection.add(annotationId);
      committedSelection.add(annotationId);
      return;
    }

    if (isSelected) {
      previewSelection.delete(annotationId);
      committedSelection.delete(annotationId);
    } else {
      previewSelection.add(annotationId);
      committedSelection.add(annotationId);
    }
  };

  const focusedAnnotation = computed<WorkflowObject | null>(() => {
    if (
      focusedObject.value?.type !== "annotation" ||
      !workflowStore.activeWorkflow
    ) {
      return null;
    }

    const annotation = workflowStore.activeWorkflow.workflowAnnotations.find(
      ({ id }) => id === focusedObject.value?.id,
    );

    return annotation
      ? { id: annotation.id, type: "annotation", ...annotation.bounds }
      : null;
  });

  const selectAll = (mode: SelectionMode = "committed") => {
    const allAnnotationIds =
      workflowStore.activeWorkflow!.workflowAnnotations.map(({ id }) => id);
    setAnnotationSelection(allAnnotationIds, mode);
  };

  const deselectAll = (mode: SelectionMode = "committed") => {
    setAnnotationSelection([], mode);
  };

  const getAnnotationVisualSelectionState = (annotationId: string) => {
    const showSelection = computed(() => {
      return previewSelection.has(annotationId) && !shouldHideSelection.value;
    });

    const showFocus = computed(
      () => focusedAnnotation.value?.id === annotationId,
    );

    return {
      showFocus,
      showSelection,
    };
  };

  const query = (mode: SelectionMode) => {
    const _state = mode === "committed" ? committedSelection : previewSelection;

    const selectedAnnotationIds = computed(() => [..._state.values()]);

    const getSelectedAnnotations = computed(() => {
      return workflowStore.activeWorkflow
        ? workflowStore.activeWorkflow.workflowAnnotations.filter(({ id }) =>
            _state.has(id),
          )
        : [];
    });

    const singleSelectedAnnotation = computed(() => {
      return getSelectedAnnotations.value.length === 1
        ? getSelectedAnnotations.value[0]
        : null;
    });

    const isAnnotationSelected = (id: string) => _state.has(id);

    return {
      selectedAnnotationIds,
      singleSelectedAnnotation,
      getSelectedAnnotations,
      isAnnotationSelected,
    };
  };

  return {
    selectedAnnotations: readonly(previewSelection),
    selectedAnnotationIds,
    getSelectedAnnotations,
    singleSelectedAnnotation,

    isAnnotationSelected: (id: string) =>
      committedSelection.has(id) || previewSelection.has(id),

    selectAnnotations: (ids: string[], mode: SelectionMode = "committed") => {
      if (mode === "committed") {
        return setAnnotationSelection(
          [...selectedAnnotationIds.value, ...ids],
          mode,
        );
      } else {
        return setAnnotationSelection(
          [...previewSelection.values(), ...ids],
          mode,
        );
      }
    },

    deselectAnnotations: (ids: string[], mode: SelectionMode = "committed") => {
      return setAnnotationSelection(
        selectedAnnotationIds.value.filter((id) => !ids.includes(id)),
        mode,
      );
    },

    getAnnotationVisualSelectionState,

    startedSelectionFromAnnotationId,
    didStartRectangleSelection,
    toggleAnnotationSelection,

    internal: {
      query,
      previewSelectedAnnotations: readonly(previewSelection),
      committedSelectedAnnotations: readonly(committedSelection),
      focusedAnnotation,
      selectAll,
      deselectAll,
      hasUncommittedSelection,
      commitSelection,
    },
  };
};
