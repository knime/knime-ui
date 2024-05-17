import { computed, ref, type Ref } from "vue";

export type MetadataDraft<T> = {
  isEditing: boolean;
  isValid: boolean;
  hasEdited: boolean;
  data: T;
};

type UseDraftOptions<T> = {
  createNewDraft: () => MetadataDraft<T>;
};

export const useDraft = <T>(options: UseDraftOptions<T>) => {
  // need to cast here. see: https://github.com/vuejs/core/issues/2136#issuecomment-693524663
  const metadataDraft = ref(options.createNewDraft()) as Ref<MetadataDraft<T>>;

  const resetDraft = () => {
    metadataDraft.value = options.createNewDraft();
  };

  const isEditing = computed(() => metadataDraft.value.isEditing);
  const isValid = computed(() => metadataDraft.value.isValid);

  const startEdit = () => {
    metadataDraft.value.isEditing = true;
  };

  const cancelEdit = () => {
    resetDraft();
  };

  const getMetadataFieldValue = <K extends keyof MetadataDraft<T>["data"]>(
    fieldName: K,
  ) => {
    return metadataDraft.value.data[fieldName];
  };

  const updateMetadataField = <K extends keyof MetadataDraft<T>["data"]>(
    fieldName: K,
    value: MetadataDraft<T>["data"][K],
  ) => {
    metadataDraft.value.data[fieldName] = value;
    metadataDraft.value.hasEdited = true;
  };

  return {
    metadataDraft,
    resetDraft,
    isEditing,
    isValid,
    startEdit,
    cancelEdit,
    getMetadataFieldValue,
    updateMetadataField,
  };
};
