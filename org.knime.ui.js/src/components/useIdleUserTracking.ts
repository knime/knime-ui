import { onMounted, watch } from "vue";
import { useIdle } from "@vueuse/core";

import { embeddingSDK } from "@knime/hub-features";

/**
 * Tracks idleness of the user based on interaction events (mousemove, keydown, etc).
 * This is only used in the browser and it's needed because AP is embedded in an iframe.
 * iframes swallow the interaction events when they bubble and these are no able to be listened
 * to on the parent, thus we must attach the idle listener here.
 *
 * Idleness will be used to terminate the session after a certain time threshold has been crossed.
 */
export const useIdleUserTracking = () => {
  onMounted(() => {
    const context = embeddingSDK.guest.getContext();
    if (!context) {
      return;
    }

    const { idle, lastActive } = useIdle(context.userIdleTimeout, {
      // This is set here for explicitness because it won't work anyway.
      // The AP is embedded in an iframe with a different origin than the parent,
      // then for security reasons listening to page visibility changes is not possible.
      listenForVisibilityChange: false,
    });

    watch(idle, () => {
      embeddingSDK.guest.notifyActivityChange({
        idle: idle.value,
        lastActive: new Date(lastActive.value).toISOString(),
      });
    });
  });
};
