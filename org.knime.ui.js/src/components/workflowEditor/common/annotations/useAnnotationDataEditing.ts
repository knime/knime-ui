import { type Ref, computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";

import {
  TypedText,
  type WorkflowAnnotation,
} from "@/api/gateway-api/generated-api";
import { useSelectionStore } from "@/store/selection";
import { useAnnotationInteractionsStore } from "@/store/workflow/annotationInteractions";
import { useWorkflowStore } from "@/store/workflow/workflow";
import * as $colors from "@/style/colors";
import { recreateLinebreaks } from "@/util/recreateLineBreaks";

type UseAnnotationDataEditingOptions = {
  annotation: Ref<WorkflowAnnotation>;
  focusCanvas: () => void;
};

export const useAnnotationDataEditing = (
  options: UseAnnotationDataEditingOptions,
) => {
  const { annotation, focusCanvas } = options;
  const annotationInteractionStore = useAnnotationInteractionsStore();

  const hasEdited = ref(false);
  const newAnnotationData = ref({
    richTextContent: "",
    borderColor: "",
  });

  const isEditing = computed(() => {
    return (
      annotation.value.id === annotationInteractionStore.editableAnnotationId
    );
  });

  const isRichTextAnnotation = computed(() => {
    return annotation.value.text.contentType === TypedText.ContentTypeEnum.Html;
  });

  const initialRichTextAnnotationValue = computed(() => {
    return isRichTextAnnotation.value
      ? annotation.value.text.value
      : recreateLinebreaks(annotation.value.text.value);
  });

  const initialBorderColor = computed(() => {
    if (
      hasEdited.value &&
      newAnnotationData.value.borderColor !== annotation.value.borderColor
    ) {
      return newAnnotationData.value.borderColor;
    }

    return isRichTextAnnotation.value
      ? annotation.value.borderColor
      : $colors.defaultAnnotationBorderColor;
  });

  const initializeData = () => {
    newAnnotationData.value = {
      richTextContent: initialRichTextAnnotationValue.value,
      borderColor: initialBorderColor.value,
    };
  };

  onMounted(() => {
    initializeData();
  });

  const updateAnnotation = () => {
    return annotationInteractionStore.updateAnnotation({
      annotationId: annotation.value.id,
      text: newAnnotationData.value.richTextContent,
      borderColor: newAnnotationData.value.borderColor,
    });
  };

  const onAnnotationTextChange = (content: string) => {
    hasEdited.value = true;
    newAnnotationData.value.richTextContent = content;
  };

  const onAnnotationColorChange = (color: string) => {
    hasEdited.value = true;
    newAnnotationData.value.borderColor = color;
  };

  const { isWritable } = storeToRefs(useWorkflowStore());

  const toggleEdit = () => {
    if (!isWritable.value) {
      return;
    }

    if (isEditing.value) {
      focusCanvas();
    }

    annotationInteractionStore.setEditableAnnotationId(
      isEditing.value ? null : annotation.value.id,
    );
  };

  const { isAnnotationSelected } = storeToRefs(useSelectionStore());

  const isSelected = computed(() => {
    return isAnnotationSelected.value(annotation.value.id);
  });

  const isSaving = ref(false);

  const saveContent = async () => {
    if (window.getSelection()?.toString() !== "" && isSelected.value) {
      return;
    }

    if (!isEditing.value || isSaving.value) {
      return;
    }

    if (hasEdited.value) {
      isSaving.value = true;
      await updateAnnotation();
    }

    toggleEdit();
    isSaving.value = false;
  };

  // Blur happens on:
  // - When the annotation exits the edit mode
  // - Switching to another workflow (e.g clicking on another tab)
  const onBlur = () => {
    if (hasEdited.value) {
      updateAnnotation();
    }
  };

  return {
    hasEdited,
    isEditing,
    initialRichTextAnnotationValue,
    initialBorderColor,
    toggleEdit,
    saveContent,
    onBlur,
    onAnnotationTextChange,
    onAnnotationColorChange,
  };
};
