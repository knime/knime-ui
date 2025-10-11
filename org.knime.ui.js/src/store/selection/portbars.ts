import { computed, ref } from "vue";

import { selectionAdder, selectionRemover } from "./utils";

export const usePortbarSelection = () => {
  type MetanodePortBarType = "in" | "out";
  const selectedMetanodePortBars = ref<Record<string, boolean>>({});
  const getSelectedMetanodePortBars = computed(
    () =>
      Object.keys(selectedMetanodePortBars.value).filter(
        (type) => selectedMetanodePortBars.value[type as MetanodePortBarType],
      ) as MetanodePortBarType[],
  );

  const deselectAll = () => {
    if (Object.keys(selectedMetanodePortBars.value).length > 0) {
      selectedMetanodePortBars.value = {};
    }
  };

  return {
    getSelectedMetanodePortBars,

    isMetaNodePortBarSelected: (type: "in" | "out") =>
      Boolean(selectedMetanodePortBars.value[type]),

    selectMetanodePortBar: (type: "in" | "out" | Array<"in" | "out">) =>
      selectionAdder(selectedMetanodePortBars)(type),

    deselectMetanodePortBar: (type: "in" | "out" | Array<"in" | "out">) =>
      selectionRemover(selectedMetanodePortBars)(type),

    internal: {
      deselectAll,
    },
  };
};
