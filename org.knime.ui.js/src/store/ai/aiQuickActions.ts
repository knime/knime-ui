import { type Ref, computed, ref, watch } from "vue";
import { API } from "@api";
import { defineStore } from "pinia";

import { promise } from "@knime/utils";

import {
  type Bounds,
  KaiQuickActionError,
  type KaiQuickActionGenerateAnnotationResponse,
  type KaiQuickActionResponse,
} from "@/api/gateway-api/generated-api";
import { useHubAuth } from "@/components/kai/useHubAuth";
import { useAiQuickActionContext } from "@/composables/useAiQuickActionContext/useAiQuickActionContext";
import {
  HubLoginAction,
  useHubLoginDialog,
} from "@/composables/useConfirmDialog/useHubLoginDialog";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import {
  createQuickActionError,
  parseQuickActionError,
} from "@/toastPresets/aiQuickActions";
import { useApplicationStore } from "../application/application";
import { useSelectionStore } from "../selection";
import { useAnnotationInteractionsStore } from "../workflow/annotationInteractions";

import { QuickActionId } from "./types";

type QuickActionMetadata = {
  [QuickActionId.GenerateAnnotation]: {
    bounds: Bounds;
    selectedNodeIds: string[];
  };
};

const HUB_LOGIN_DIALOG_TITLE = "Log in to KNIME Hub";
const HUB_LOGIN_DIALOG_MESSAGE = `Log in with your KNIME Hub account to instantly benefit from one-click workflow
      documentation, AI-assisted workflow building, and smart code assistance.`;

export const useAiQuickActionsStore = defineStore("aiQuickActions", () => {
  const availableQuickActions: Ref<string[] | null> = ref(null);
  const processingActions: Ref<Partial<QuickActionMetadata>> = ref({});

  const { isAuthenticated, hubID, isUserLicensed } = useHubAuth();

  let fetchPromise: Promise<void> | null = null;

  /**
   * Fetches the list of available quick actions from the Hub.
   *
   * Only fetches once for the mounted and authenticated Hub configured as K-AI's backend.
   * Re-fetches if the configured Hub changed.
   */
  const fetchAvailableQuickActions = (): Promise<void> => {
    // already fetched
    if (availableQuickActions.value !== null) {
      return Promise.resolve();
    }

    // currently fetching
    if (fetchPromise) {
      return fetchPromise;
    }

    const projectId = useApplicationStore().activeProjectId;
    if (!projectId) {
      return Promise.resolve();
    }

    fetchPromise = (async () => {
      try {
        const response = await API.kai.listQuickActions({ projectId });
        availableQuickActions.value = response.availableActions;
      } catch (error) {
        consola.error(
          "Something went wrong while fetching available AI quick actions from KNIME Hub:",
          error,
        );
        // Either the AI Service of the Hub isn't available, or AI quick actions aren't supported by the Hub
        availableQuickActions.value = [];
      } finally {
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  };

  /**
   * Watch for authentication status and fetch available actions when user logs in.
   */
  watch(
    isAuthenticated,
    (authenticated) => {
      if (authenticated) {
        fetchAvailableQuickActions();
      }

      // reset to trigger the optimistic UI rendering
      availableQuickActions.value = null;
    },
    { immediate: true },
  );

  /**
   * Reset fetched available quick actions if user changes which Hub is used as K-AI's backend.
   */
  watch(hubID, () => {
    availableQuickActions.value = null;
  });

  /**
   * Ensures user is authenticated with KNIME Hub and supported quick actions are fetched.
   * Shows login dialog if not authenticated.
   */
  const ensureAuthenticated = async (): Promise<boolean> => {
    if (isAuthenticated.value) {
      await fetchAvailableQuickActions();
      return true;
    }

    const result = await useHubLoginDialog({
      title: HUB_LOGIN_DIALOG_TITLE,
      message: HUB_LOGIN_DIALOG_MESSAGE,
      hubId: hubID.value ?? "KNIME Hub",
    });

    if (result === HubLoginAction.LOGIN) {
      await fetchAvailableQuickActions();
      return true;
    }

    return false;
  };

  /**
   * Execute specified quick action by calling K-AI API.
   * Assumes authentication and capabilities check have already been performed.
   */
  const executeQuickAction = async (
    actionId: QuickActionId,
  ): Promise<KaiQuickActionResponse> => {
    if (!availableQuickActions.value?.includes(actionId)) {
      throw createQuickActionError(
        KaiQuickActionError.CodeEnum.SERVICEUNAVAILABLE,
        `This AI quick action is not supported by ${
          hubID.value ?? "KNIME Hub"
        }.`,
      );
    }

    try {
      const context = useAiQuickActionContext(actionId);
      if (!context) {
        throw createQuickActionError(
          KaiQuickActionError.CodeEnum.VALIDATIONERROR,
          `Looks like something went wrong while trying to generate the annotation.
            Please try again. If the issue persists, please report this via the KNIME Forum.`,
        );
      }

      const projectId = useApplicationStore().activeProjectId;
      if (!projectId) {
        throw createQuickActionError(
          KaiQuickActionError.CodeEnum.VALIDATIONERROR,
          "No active workflow found.",
        );
      }

      const response = await promise.retryPromise({
        fn: () =>
          API.kai.executeQuickAction({
            kaiQuickActionId: actionId,
            kaiQuickActionRequest: {
              actionId,
              projectId,
              context,
            },
          }),
        retryCount: 1,
        retryDelayMS: 500,
        excludeError: (error: Error) => {
          // only retry for LLMERROR (i.e. AI made a mistake, could work on second try)
          const parsedError = parseQuickActionError(error);
          return parsedError.code !== KaiQuickActionError.CodeEnum.LLMERROR;
        },
      });

      return response;
    } catch (error) {
      // re-throw to propagate the error to the caller
      const parsedError = parseQuickActionError(error);
      throw createQuickActionError(parsedError.code, parsedError.message);
    }
  };

  /**
   * Generates a workflow annotation for the selected nodes using K-AI.
   */
  const generateAnnotation = async () => {
    const actionId = QuickActionId.GenerateAnnotation;

    try {
      if (actionId in processingActions.value) {
        return;
      }

      // capture and store selection state before checking for authentication. If user logs in,
      // there is usually a few seconds of loading, during which the user might have clicked away, thus
      // deselecting the nodes, but we still want to process for that original selection.
      processingActions.value[actionId] = {
        bounds:
          useAnnotationInteractionsStore().getAnnotationBoundsForSelectedNodes,
        selectedNodeIds: useSelectionStore().selectedNodeIds,
      };

      if (!(await ensureAuthenticated())) {
        return;
      }

      const response = (await executeQuickAction(
        actionId,
      )) as KaiQuickActionGenerateAnnotationResponse;

      await useAnnotationInteractionsStore().addWorkflowAnnotationWithContent({
        bounds: processingActions.value[actionId].bounds,
        content: response.result.annotationText,
      });
    } catch (error) {
      consola.error("Something went wrong while generating annotation:", error);
      // re-throw to propagate the error to the caller
      const parsedError = parseQuickActionError(error);
      throw createQuickActionError(parsedError.code, parsedError.message);
    } finally {
      delete processingActions.value[actionId];
    }
  };

  const isQuickActionAvailable = (actionId: QuickActionId): boolean => {
    if (!useIsKaiEnabled().isKaiEnabled.value) {
      return false;
    }

    // user is e.g. a consumer (not part of a team)
    if (!isUserLicensed.value) {
      return false;
    }

    // list of actions not fetched yet -> render corresponding UI optimistically
    if (availableQuickActions.value === null) {
      return true;
    }

    // action already in progress
    if (actionId in processingActions.value) {
      return false;
    }

    return availableQuickActions.value.includes(actionId);
  };

  return {
    // exposed for testing
    availableQuickActions: computed(() => availableQuickActions.value),
    ensureAuthenticated,

    // public API
    processingActions: computed(() => processingActions.value),
    generateAnnotation,
    isQuickActionAvailable,
  };
});
