import { type Ref, computed, ref, watch } from "vue";

import type { NodeRelation } from "@/api/custom-types";
import type { NodePort } from "@/api/gateway-api/generated-api";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";

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

  const isQuickBuildModeAvailable = computed(() =>
    useAIAssistantStore().isQuickBuildModeAvailable(
      nodeRelation.value,
      port.value?.typeId,
    ),
  );

  watch(
    isQuickBuildModeAvailable,
    (value) => {
      if (!value) {
        setQuickAddMode();
      }
    },
    { immediate: true },
  );

  return {
    menuMode,
    setQuickAddMode,
    setQuickBuildMode,
    isQuickBuildModeAvailable,
  };
};
