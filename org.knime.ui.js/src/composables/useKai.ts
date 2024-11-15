import { computed } from "vue";

import { useStore } from "./useStore";

export const useKai = () => {
  const store = useStore();
  const isKaiEnabled = computed(() => store.state.application.isKaiEnabled);

  return { isKaiEnabled };
};
