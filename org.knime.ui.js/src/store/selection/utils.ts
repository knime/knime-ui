import { type Ref, computed, ref } from "vue";

export const selectionAdder =
  (target: Ref<Record<string, boolean>>) => (toAdd: string[] | string) => {
    if (Array.isArray(toAdd)) {
      toAdd.forEach((id) => (target.value[id] = true));
    } else {
      target.value[toAdd] = true;
    }
  };

export const selectionRemover =
  (target: Ref<Record<string, boolean>>) => (toRemove: string[] | string) => {
    if (Array.isArray(toRemove)) {
      toRemove.forEach((id) => delete target.value[id]);
    } else {
      delete target.value[toRemove];
    }
  };

export const useStateWithPreview = () => {
  const previewVersion = ref(0);
  const commitVersion = ref(0);

  /**
   * Changes immediately upon a selection state change. Used for immediate
   * interactions, which require faster frames (e.g canvas interactions)
   */
  const previewSelection = ref<Record<string, boolean>>({});
  /**
   * Changes depending on selection mode. If mode is delayed, then selection
   * must be committed before this value takes effect. Used for interactions
   * that depend on selection state but that have a heavy impact on the main thread
   * (e.g rendering UI extensions)
   */
  const committedSelection = ref<Record<string, boolean>>({});

  const commitSelection = () => {
    consola.trace("Committing selection");
    committedSelection.value = { ...previewSelection.value };
    commitVersion.value = previewVersion.value;
  };

  const updatePreview = (newState: Record<string, boolean>) => {
    previewSelection.value = newState;
    previewVersion.value++;
  };

  const hasUncommittedSelection = computed(
    () => commitVersion.value !== previewVersion.value,
  );

  return {
    previewSelection,
    committedSelection,
    hasUncommittedSelection,
    updatePreview,
    commitSelection,
  };
};
