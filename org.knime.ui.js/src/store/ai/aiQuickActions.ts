import { type Ref, reactive, ref } from "vue";
import { API } from "@api";
import { defineStore, storeToRefs } from "pinia";

import { promise } from "@knime/utils";

import {
  KaiQuickActionError,
  type KaiQuickActionGenerateAnnotationRequest,
  type KaiQuickActionGenerateAnnotationResponse,
  KaiQuickActionRequest,
} from "@/api/gateway-api/generated-api";
import { useHubAuth } from "@/components/kai/useHubAuth";
import { useAiContextBuilder } from "@/composables/useAiContextBuilder";
import {
  HubLoginAction,
  useHubLoginDialog,
} from "@/composables/useConfirmDialog/useHubLoginDialog";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { getToastPresets } from "@/toastPresets";
import { parseQuickActionError } from "@/toastPresets/aiQuickActions";
import { useApplicationStore } from "../application/application";
import { useAnnotationInteractionsStore } from "../workflow/annotationInteractions";

import { useAIAssistantStore } from "./aiAssistant";
import { type ActionsStates, KaiQuickActionId } from "./types";

const HUB_LOGIN_DIALOG_TITLE = "Log in to KNIME Hub to access AI features";
const HUB_LOGIN_DIALOG_MESSAGE = `Log in with your KNIME Hub account to instantly benefit from one-click workflow
      documentation, AI-assisted workflow building, and smart code assistance.`;

const handleQuickActionError = async (error: any) => {
  const { toastPresets } = getToastPresets();
  const parsedError = parseQuickActionError(error);

  switch (parsedError.code) {
    case KaiQuickActionError.CodeEnum.VALIDATIONERROR:
      toastPresets!.aiQuickActions.validationError({
        message: parsedError.message,
      });
      break;

    case KaiQuickActionError.CodeEnum.LLMERROR:
      toastPresets!.aiQuickActions.llmError({
        message: parsedError.message,
      });
      break;

    case KaiQuickActionError.CodeEnum.AUTHENTICATIONFAILED: {
      const { authenticateWithHub, hubID } = useHubAuth();
      toastPresets!.aiQuickActions.authenticationFailed({
        message: parsedError.message,
        hubId: hubID.value ?? "KNIME Hub",
        onLogin: async () => {
          await authenticateWithHub();
        },
      });
      break;
    }

    case KaiQuickActionError.CodeEnum.QUOTAEXCEEDED:
      // usage not included with the error data. Fetch here to ensure other AI UI
      // reflects exceeded usage quota
      await useAIAssistantStore().fetchUsage();
      toastPresets!.aiQuickActions.quotaExceeded({
        message: parsedError.message,
      });
      break;

    case KaiQuickActionError.CodeEnum.SERVICEUNAVAILABLE:
      toastPresets!.aiQuickActions.serviceUnavailable({
        message: parsedError.message,
      });
      break;

    case KaiQuickActionError.CodeEnum.TIMEOUT:
      toastPresets!.aiQuickActions.timeout({
        message: parsedError.message,
      });
      break;

    default:
      toastPresets!.aiQuickActions.unknownError({
        message: parsedError.message,
      });
      break;
  }
};

export const useAiQuickActionsStore = defineStore("aiQuickActions", () => {
  // state
  const { activeProjectId } = storeToRefs(useApplicationStore());
  const { isAuthenticated, hubID } = useHubAuth();
  const availableQuickActions: Ref<string[]> = ref([]);
  const actionsStates = reactive<ActionsStates>({
    [KaiQuickActionId.generateAnnotation]: {
      status: "idle",
      bounds: null,
    },
  });

  // actions
  const fetchAvailableQuickActions = async () => {
    if (!useIsKaiEnabled().isKaiEnabled) {
      return;
    }

    if (!isAuthenticated.value) {
      return;
    }

    if (!activeProjectId.value) {
      return;
    }

    try {
      const response = await API.kai.listQuickActions({
        projectId: activeProjectId.value,
      });
      availableQuickActions.value = response.availableActions;
    } catch (error: any) {
      consola.error(error);
    }
  };

  const ensureUserIsAuthenticated = async () => {
    // we show a "Log in to KNIME Hub" dialog modal when user clicks a quick action button
    if (isAuthenticated.value) {
      return true;
    }

    const actionFromDialog = await useHubLoginDialog({
      title: HUB_LOGIN_DIALOG_TITLE,
      message: HUB_LOGIN_DIALOG_MESSAGE,
    });

    return actionFromDialog !== HubLoginAction.CANCEL;
  };

  // quick actions
  const generateAnnotation = async () => {
    const generateAnnotationId =
      KaiQuickActionRequest.ActionIdEnum.GenerateAnnotation;

    if (actionsStates[generateAnnotationId].status === "processing") {
      return;
    }

    actionsStates[generateAnnotationId] = {
      status: "waiting",
      bounds: null,
    };
    const shouldProceed = await ensureUserIsAuthenticated();
    if (!shouldProceed) {
      actionsStates[generateAnnotationId] = {
        status: "idle",
        bounds: null,
      };
      return;
    }

    const { toastPresets } = getToastPresets();

    if (!availableQuickActions.value.includes(generateAnnotationId)) {
      toastPresets!.aiQuickActions.actionNotSupported({
        hubId: hubID.value ?? "KNIME Hub",
      });
      return;
    }

    const annotationInteractions = useAnnotationInteractionsStore();
    const capturedBounds =
      annotationInteractions.getAnnotationBoundsForSelectedNodes;

    // extend the annotation upward to allow for more text
    capturedBounds.y -= 30;
    capturedBounds.height += 30;

    actionsStates[generateAnnotationId] = {
      status: "processing",
      bounds: capturedBounds,
    };

    try {
      const { buildForQuickAction } = useAiContextBuilder();
      const context = buildForQuickAction(generateAnnotationId);

      if (!context || !activeProjectId.value) {
        toastPresets!.aiQuickActions.noActiveWorkflow();
        return;
      }

      const request: KaiQuickActionGenerateAnnotationRequest = {
        actionId: generateAnnotationId,
        projectId: activeProjectId.value,
        context,
      };

      const response = await promise.retryPromise({
        fn: async () =>
          (await API.kai.executeQuickAction({
            kaiQuickActionId: generateAnnotationId,
            kaiQuickActionRequest: request,
          })) as KaiQuickActionGenerateAnnotationResponse,
        retryCount: 1,
        retryDelayMS: 500,
        excludeError: (error: Error) => {
          // Only retry for LLMERROR, all other errors should be thrown immediately
          const parsedError = parseQuickActionError(error);
          return parsedError.code !== KaiQuickActionError.CodeEnum.LLMERROR;
        },
      });

      if (response.usage) {
        useAIAssistantStore().updateUsage(response.usage);
      }

      await annotationInteractions.addWorkflowAnnotation({
        bounds: capturedBounds,
        content: response.result.annotationText,
      });
    } catch (error: unknown) {
      await handleQuickActionError(error);
    } finally {
      actionsStates[generateAnnotationId] = {
        status: "idle",
        bounds: null,
      };
    }
  };

  return {
    fetchAvailableQuickActions,
    availableQuickActions,
    actionsStates,
    generateAnnotation,
  };
});
