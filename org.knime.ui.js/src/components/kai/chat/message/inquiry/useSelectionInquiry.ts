import { computed, ref } from "vue";

import type { KaiInquiry } from "@/api/gateway-api/generated-api";
import { useAIAssistantStore } from "@/store/ai/aiAssistant";
import type { ChainType } from "@/store/ai/types";

import { useInquiryLifecycle } from "./useInquiryLifecycle";

type UseSelectionInquiryParams = {
  inquiry: KaiInquiry;
  chainType: ChainType;
};

export const useSelectionInquiry = ({
  inquiry,
  chainType,
}: UseSelectionInquiryParams) => {
  const aiAssistantStore = useAIAssistantStore();

  const optionValues = computed(() =>
    inquiry.options.map((option) => ({
      id: option.id,
      text: option.label,
      helperText: option.helperText,
    })),
  );

  const freeformText = ref("");

  const skip = (suffix?: string) => {
    aiAssistantStore.respondToInquiry({
      chainType,
      selectedOptionIds: [],
      freeformInput: null,
      suffix,
    });
  };

  const { remainingSeconds, isCountdownVisible, resolveOnce } =
    useInquiryLifecycle({
      timeoutSeconds: inquiry.timeoutSeconds,
      onTimeout: () => skip("Timed out"),
      onUnmountUnresolved: () => skip(),
    });

  const skipLabel = computed(() => {
    if (isCountdownVisible.value) {
      return `Skip (${remainingSeconds.value})`;
    }
    return "Skip";
  });

  const submitSelection = ({
    selectedOptionIds,
    includeFreeformInput,
  }: {
    selectedOptionIds: string[];
    includeFreeformInput: boolean;
  }) => {
    const trimmedFreeformInput = freeformText.value.trim();

    resolveOnce(() =>
      aiAssistantStore.respondToInquiry({
        chainType,
        selectedOptionIds,
        freeformInput: includeFreeformInput ? trimmedFreeformInput : null,
      }),
    );
  };

  return {
    optionValues,
    freeformText,
    skip,
    skipLabel,
    submitSelection,
    resolveOnce,
  };
};
