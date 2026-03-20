import { computed } from "vue";
import { storeToRefs } from "pinia";

import { useApplicationStore } from "@/store/application/application";

/**
 * Composable for generating Analytics Platform download URLs with tracking sources
 */
export const useAnalyticsPlatformDownloadUrl = (src: string) => {
  const { analyticsPlatformDownloadURL } = storeToRefs(useApplicationStore());

  const href = computed(() => {
    const baseUrl = analyticsPlatformDownloadURL.value;
    if (!baseUrl) {
      return "";
    }

    const url = new URL(baseUrl);
    url.searchParams.set("src", src);
    return url.toString();
  });

  return { href };
};
