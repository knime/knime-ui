import { type Ref, computed, ref, watch } from "vue";

import type { NodeRelation } from "@/api/custom-types";
import type { NodePort } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";

const menuMode = ref<"quick-add" | "quick-build">("quick-add");

export const useQuickActionMenu = ({
  port,
  nodeRelation,
}: {
  port: Ref<NodePort | null>;
  nodeRelation: Ref<NodeRelation | null>;
}) => {
  const setQuickAddMode = () => (menuMode.value = "quick-add");
  const setQuickBuildMode = () => (menuMode.value = "quick-build");

  const store = useStore();

  const isQuickBuildAvailableForPort = computed(() =>
    store.getters["aiAssistant/isQuickBuildAvailableForPort"](
      nodeRelation.value,
      port.value?.typeId,
    ),
  );

  watch(isQuickBuildAvailableForPort, (value) => {
    if (!value) {
      menuMode.value = "quick-add";
    }
  });

  return {
    menuMode,
    setQuickAddMode,
    setQuickBuildMode,
    isQuickBuildAvailableForPort,
  };
};
