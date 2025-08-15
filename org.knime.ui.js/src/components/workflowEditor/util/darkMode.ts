import { computed } from "vue";
import { useLocalStorage } from "@vueuse/core";

export const DARK_MODE_STORAGE_KEY = "KNIME_DARK_MODE";

export type DarkModeType = "light" | "dark" | "system";

// could also be system, but the previous behaviour forced it to light, so we use that
const defaultRenderer: DarkModeType = "light";

export const useDarkMode = () => {
  const currentMode = useLocalStorage<DarkModeType>(
    DARK_MODE_STORAGE_KEY,
    defaultRenderer,
  );

  const setDarkMode = (type: DarkModeType) => {
    currentMode.value = type;
  };

  const isDarkMode = computed(() => currentMode.value === "dark");
  const isLightMode = computed(() => currentMode.value === "light");
  const isSystemMode = computed(() => currentMode.value === "system");

  return {
    currentMode,
    setDarkMode,
    isDarkMode,
    isLightMode,
    isSystemMode,
  };
};
