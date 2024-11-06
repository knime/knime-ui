import { computed, ref } from "vue";

import { encodeString } from "@/util/encodeString";
import { useHubAuth } from "../useHubAuth";
import { useKaiServer } from "../useKaiServer";

const _shouldShowDisclaimer = ref(true);

export const useDisclaimer = () => {
  const { uiStrings } = useKaiServer();
  const disclaimerText = computed(() => uiStrings.disclaimer);

  const { hubId, userName } = useHubAuth();

  const localStorageKey = computed(() => {
    if (!hubId.value || !userName.value || !disclaimerText.value) {
      return null;
    }
    const identifier = `${hubId.value}${userName.value}${disclaimerText.value}`;
    return `kai-persistently-hide-disclaimer-${encodeString(identifier)}`;
  });

  const persistentlyHydeDisclaimer = computed(() =>
    localStorageKey.value
      ? Boolean(localStorage.getItem(localStorageKey.value))
      : false,
  );

  const closeDisclaimer = (persistently: boolean = true) => {
    _shouldShowDisclaimer.value = false;

    if (localStorageKey.value && persistently) {
      localStorage.setItem(localStorageKey.value, "true");
    }
  };

  const shouldShowDisclaimer = computed(
    () => _shouldShowDisclaimer.value && !persistentlyHydeDisclaimer.value,
  );

  return { disclaimerText, closeDisclaimer, shouldShowDisclaimer };
};
