import { type Ref, computed, ref, watch } from "vue";

import type { NodeRelation } from "@/api/custom-types";
import type { NodePort } from "@/api/gateway-api/generated-api";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { optional } from "@/lib/fp";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";

const activeMode = ref<"nodes" | "components" | "k-ai">("nodes");

export const useQuickActionMenuMode = ({
  port,
  nodeRelation,
}: {
  port: Ref<NodePort | null>;
  nodeRelation: Ref<NodeRelation | null>;
}) => {
  const { isKaiEnabled } = useIsKaiEnabled();
  const isQuickBuildModeAvailable = computed(() =>
    useAIAssistantStore().isQuickBuildModeAvailable(
      nodeRelation.value,
      port.value?.typeId,
    ),
  );

  const availableModes = computed(() => {
    return [
      { id: "nodes", text: "Nodes" },
      { id: "components", text: "Components" },
      ...optional(isKaiEnabled.value && isQuickBuildModeAvailable.value, {
        id: "k-ai",
        text: "K-AI Build mode",
      }),
    ];
  });

  watch(
    [isKaiEnabled, isQuickBuildModeAvailable],
    () => {
      if (activeMode.value !== "k-ai") {
        return;
      }

      if (!isKaiEnabled.value || !isQuickBuildModeAvailable.value) {
        activeMode.value = "nodes";
      }
    },
    { immediate: true },
  );

  return {
    activeMode,
    availableModes,
  };
};
