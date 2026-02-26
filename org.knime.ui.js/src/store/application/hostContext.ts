import { computed, ref, watch } from "vue";
import { useIdle } from "@vueuse/core";
import { defineStore, storeToRefs } from "pinia";

import { embeddingSDK } from "@knime/hub-features";

import { isDesktop } from "@/environment";
import { useWorkflowStore } from "../workflow/workflow";

/**
 * This store is meant to contain and coordinate actions that are required to interact with the
 * host context, when the AP is embedded in the browser. It's meant to expose mostly fire-and-forget
 * actions and/or to setup internal logic that required in this particular context
 */
export const useHostContextStore = defineStore("hostContext", () => {
  const isTrackingIdleness = ref(false);

  const workflowStore = useWorkflowStore();
  const { activeWorkflow } = storeToRefs(workflowStore);
  const isProjectExecuting = computed(() =>
    Boolean(activeWorkflow.value?.isProjectExecuting),
  );

  /**
   * Sends a navigation request to take the user to the cloud version of the home screen
   */
  const navigateHome = () => {
    if (isDesktop()) {
      return;
    }

    embeddingSDK.guest.dispatchGenericEventToHost({
      kind: "hostNavigationRequest",
      payload: {
        intent: "go-to",
        destination: "cloud-home",
        openIn: "_parent",
      },
    });
  };

  type ActivityState = "active" | "idle" | "background-task";
  const currentIdleState = ref<ActivityState>("active");

  const getNextActivityState = (
    isIdle: boolean,
    executing: boolean,
  ): ActivityState => {
    if (!isIdle && !executing) {
      return "active";
    }

    if (isIdle && !executing) {
      return "idle";
    }

    // transition to background-task right away instead of "active", even though user is NOT idle
    // This is needed because idleness is based on time when the user is not doing anything.
    // However, if an execution is started and immediately the user hides the tab, there won't
    // be enough time to for the idleness to kick in and the page visiblity will think of this as
    // "was active" -> "inactive".
    // For this reason, execution takes priority over interaction state
    if (!isIdle && executing) {
      return "background-task";
    }

    if (isIdle && executing) {
      return "background-task";
    }

    // logical table for 2 booleans is covered, this cannot happen
    throw new Error("Assert: Unreacheable code");
  };

  /**
   * Setups the idleness tracking of the user based on interaction events (mousemove, keydown, etc).
   * This is only used in the browser and it's needed because AP is embedded in an iframe.
   * iframes swallow the interaction events when they bubble and these are no able to be listened
   * to on the parent, thus we must attach the idle listener here.
   *
   * Idleness will be used to terminate the session after a certain time threshold has been crossed.
   */
  const setupIdleTracking = () => {
    if (isDesktop() || isTrackingIdleness.value) {
      return;
    }

    const context = embeddingSDK.guest.getContext();
    if (!context) {
      return;
    }

    const { idle } = useIdle(context.userIdleTimeout, {
      // This is set here for explicitness because it won't work anyway.
      // The AP is embedded in an iframe with a different origin than the parent,
      // then for security reasons listening to page visibility changes is not possible.
      listenForVisibilityChange: false,
    });

    watch([idle, isProjectExecuting], ([isIdle, isExecuting]) => {
      const nextState = getNextActivityState(isIdle, isExecuting);

      // skip unnecessary events
      if (nextState === currentIdleState.value) {
        return;
      }

      currentIdleState.value = nextState;

      embeddingSDK.guest.notifyActivityChange({
        state: nextState,
        version: "v1",
        lastActive: new Date().toISOString(),
      });
    });

    isTrackingIdleness.value = true;
  };

  return { navigateHome, setupIdleTracking };
});
