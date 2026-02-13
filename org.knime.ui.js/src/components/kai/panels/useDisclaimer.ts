import { computed, ref } from "vue";

import { useAISettingsStore } from "@/store/ai/aiSettings";
import { useKaiServer } from "../useKaiServer";

const hasBeenDismissed = ref(false);

export const useDisclaimer = () => {
  const { uiStrings } = useKaiServer();
  const disclaimerText = computed(() => uiStrings.disclaimer ?? "");

  const aiSettingsStore = useAISettingsStore();

  const closeDisclaimer = async (persistently: boolean = true) => {
    hasBeenDismissed.value = true;

    if (persistently && disclaimerText.value) {
      await aiSettingsStore.dismissDisclaimer(disclaimerText.value);
    }
  };

  const shouldShowDisclaimer = computed(
    () =>
      !hasBeenDismissed.value &&
      Boolean(disclaimerText.value) &&
      !aiSettingsStore.isDisclaimerDismissed(disclaimerText.value),
  );

  return { disclaimerText, closeDisclaimer, shouldShowDisclaimer };
};
