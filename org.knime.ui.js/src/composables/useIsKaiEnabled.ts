import { storeToRefs } from "pinia";

import { useApplicationSettingsStore } from "@/store/application/settings";

export const useIsKaiEnabled = () => {
  const { isKaiEnabled } = storeToRefs(useApplicationSettingsStore());

  return { isKaiEnabled };
};
