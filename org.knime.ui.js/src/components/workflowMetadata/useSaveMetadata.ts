import { onBeforeUnmount, watch, type Ref } from "vue";
import { onClickOutside } from "@vueuse/core";

import type { ProjectMetadata } from "@/api/gateway-api/generated-api";
import type { ComponentMetadata } from "@/api/custom-types";

import type { MetadataDraft } from "./useDraft";
import type { MetadataDraftData as ProjectMetadataDraftData } from "./ProjectMetadata.vue";
import type { MetadataDraftData as ComponentMetadataDraftData } from "./ComponentMetadata.vue";

type UseSaveMetadataOptions<T> = {
  /**
   * Original unchanged data. Used to track when changing to a different
   * data set
   */
  originalData: Ref<ProjectMetadata | ComponentMetadata>;
  /**
   * Draft of the current changes to the data
   */
  metadataDraft: Ref<MetadataDraft<T>>;
  /**
   * Element that renders the metadata. Used to track "click-away" behavior
   */
  metadataWrapperElement: Ref<HTMLElement>;
  /**
   * Callback to perfom the actual data save
   */
  triggerSave: () => void;
  /**
   * Callback to reset the current data draft
   */
  resetDraft: () => void;
  /**
   * Cancel the current edit
   */
  cancelEdit: () => void;
  singleMetanodeSelectedId: Ref<string | null>;
};

export const useSaveMetadata = (
  options: UseSaveMetadataOptions<
    ProjectMetadataDraftData | ComponentMetadataDraftData
  >,
) => {
  const {
    metadataDraft,
    originalData,
    metadataWrapperElement,
    singleMetanodeSelectedId,
    triggerSave,
    resetDraft,
    cancelEdit,
  } = options;

  const saveContent = () => {
    if (!metadataDraft.value.hasEdited) {
      cancelEdit();
      return;
    }

    // links are the only fields that are validated
    // so if they're invalid we discard their changes
    if (!metadataDraft.value.isValid) {
      metadataDraft.value.data.links = originalData.value.links ?? [];
    }

    metadataDraft.value.isEditing = false;
    metadataDraft.value.hasEdited = false;

    triggerSave();
  };

  // special case: When a single metanode gets selected
  // the metadata component remains unaware of the "click-away" because:
  // - the metadata component is not unmounted (because metanodes have no metadata)
  // - the click is intercepted by the metanode itself being clicked,
  //   so the click-away handler doesn't fire
  watch(singleMetanodeSelectedId, () => {
    // only handle selection, not deselection; that will be handled naturally by click-away
    if (singleMetanodeSelectedId.value) {
      saveContent();
    }
  });

  watch(
    originalData,
    () => {
      // skip intermediate "null" (falsy) data,
      // which can occur while changing (loading) in-between workflows
      if (!originalData) {
        return;
      }

      resetDraft();
    },
    { deep: true, immediate: true },
  );

  onClickOutside(metadataWrapperElement, () => {
    saveContent();
  });

  onBeforeUnmount(() => {
    saveContent();
  });

  return { saveContent };
};
