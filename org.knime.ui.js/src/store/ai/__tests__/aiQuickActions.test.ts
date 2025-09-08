import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import {
  type Bounds,
  KaiQuickActionError,
} from "@/api/gateway-api/generated-api";
import { useHubAuth } from "@/components/kai/useHubAuth";
import { useAiContextBuilder } from "@/composables/useAiContextBuilder";
import {
  HubLoginAction,
  useHubLoginDialog,
} from "@/composables/useConfirmDialog/useHubLoginDialog";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { KaiQuickActionId } from "@/store/ai/types";
import { createWorkflow } from "@/test/factories";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { getToastPresets } from "@/toastPresets";

const mockedAPI = deepMocked(API);

vi.mock("@/components/kai/useHubAuth");
vi.mock("@/composables/useAiContextBuilder");
vi.mock("@/composables/useConfirmDialog/useHubLoginDialog");
vi.mock("@/composables/useIsKaiEnabled");

describe("aiQuickActions store", () => {
  const createStore = ({
    isKaiEnabled = true,
    isAuthenticated = true,
    projectId = "test-project-id",
  } = {}) => {
    vi.mocked(useIsKaiEnabled).mockReturnValue({
      isKaiEnabled: isKaiEnabled as any,
    });

    const isAuthenticatedRef = ref(isAuthenticated);
    vi.mocked(useHubAuth).mockReturnValue({
      isAuthenticated: isAuthenticatedRef,
      hubID: { value: "test-hub" } as any,
      authenticateWithHub: vi.fn(),
    } as any);

    vi.mocked(useHubLoginDialog).mockResolvedValue(HubLoginAction.LOGIN);

    const mockedStores = mockStores({ stubActions: false });
    const { workflowStore, applicationStore } = mockedStores;

    applicationStore.activeProjectId = projectId;

    workflowStore.setActiveWorkflow(
      createWorkflow({
        projectId,
      }),
    );

    const { toastPresets } = getToastPresets();
    const mockToastPresets = {
      aiQuickActions: {
        actionNotSupported: vi.spyOn(
          toastPresets!.aiQuickActions,
          "actionNotSupported",
        ),
        noActiveWorkflow: vi.spyOn(
          toastPresets!.aiQuickActions,
          "noActiveWorkflow",
        ),
        validationError: vi.spyOn(
          toastPresets!.aiQuickActions,
          "validationError",
        ),
        llmError: vi.spyOn(toastPresets!.aiQuickActions, "llmError"),
        authenticationFailed: vi.spyOn(
          toastPresets!.aiQuickActions,
          "authenticationFailed",
        ),
        quotaExceeded: vi.spyOn(toastPresets!.aiQuickActions, "quotaExceeded"),
        serviceUnavailable: vi.spyOn(
          toastPresets!.aiQuickActions,
          "serviceUnavailable",
        ),
        timeout: vi.spyOn(toastPresets!.aiQuickActions, "timeout"),
        unknownError: vi.spyOn(toastPresets!.aiQuickActions, "unknownError"),
      },
    };

    return {
      mockToastPresets,
      ...mockedStores,
    };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAvailableQuickActions", () => {
    it("should fetch available quick actions when K-AI is enabled and user is authenticated", async () => {
      const { aiQuickActionsStore } = createStore({
        isKaiEnabled: true,
        isAuthenticated: true,
      });

      mockedAPI.kai.listQuickActions.mockResolvedValue({
        availableActions: [KaiQuickActionId.generateAnnotation],
      });

      await aiQuickActionsStore.fetchAvailableQuickActions();

      expect(mockedAPI.kai.listQuickActions).toHaveBeenCalledWith({
        projectId: "test-project-id",
      });
      expect(
        aiQuickActionsStore.availableQuickActions.includes(
          KaiQuickActionId.generateAnnotation,
        ),
      ).toBe(true);
    });

    it("should set empty array when K-AI is not enabled", async () => {
      const { aiQuickActionsStore } = createStore({
        isKaiEnabled: false,
      });

      await aiQuickActionsStore.fetchAvailableQuickActions();

      // After fetching with K-AI disabled, no actions should be available
      expect(
        aiQuickActionsStore.availableQuickActions.includes(
          KaiQuickActionId.generateAnnotation,
        ),
      ).toBe(false);
    });

    it("should not fetch when user is not authenticated", async () => {
      const { aiQuickActionsStore } = createStore({
        isAuthenticated: false,
      });

      await aiQuickActionsStore.fetchAvailableQuickActions();

      // Should not call the API when not authenticated
      expect(mockedAPI.kai.listQuickActions).not.toHaveBeenCalled();
    });

    it("should not fetch when no active workflow", async () => {
      const { aiQuickActionsStore, workflowStore, applicationStore } =
        createStore();

      workflowStore.setActiveWorkflow(null);
      applicationStore.activeProjectId = null;

      await aiQuickActionsStore.fetchAvailableQuickActions();

      // Should not call the API when there's no workflow
      expect(mockedAPI.kai.listQuickActions).not.toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      const { aiQuickActionsStore } = createStore();

      mockedAPI.kai.listQuickActions.mockRejectedValue(new Error("API Error"));

      await aiQuickActionsStore.fetchAvailableQuickActions();

      expect(
        aiQuickActionsStore.availableQuickActions.includes(
          KaiQuickActionId.generateAnnotation,
        ),
      ).toBe(false);
    });

    it("should not clear available actions when called before authentication is ready", async () => {
      // Simulate the race condition scenario:
      // 1. First, successfully fetch actions while authenticated
      const { aiQuickActionsStore } = createStore({
        isAuthenticated: true,
      });

      mockedAPI.kai.listQuickActions.mockResolvedValue({
        availableActions: [KaiQuickActionId.generateAnnotation],
      });

      await aiQuickActionsStore.fetchAvailableQuickActions();

      // Verify action is available
      expect(
        aiQuickActionsStore.availableQuickActions.includes(
          KaiQuickActionId.generateAnnotation,
        ),
      ).toBe(true);

      // 2. Now simulate a call when authentication is temporarily not ready
      // (e.g., during a page refresh or component remount)
      vi.mocked(useHubAuth).mockReturnValue({
        isAuthenticated: { value: false } as any,
        hubID: { value: "test-hub" } as any,
        authenticateWithHub: vi.fn(),
      } as any);

      await aiQuickActionsStore.fetchAvailableQuickActions();

      // The action should STILL be available (not cleared)
      // This prevents the button from disappearing during the race condition
      expect(
        aiQuickActionsStore.availableQuickActions.includes(
          KaiQuickActionId.generateAnnotation,
        ),
      ).toBe(true);
    });
  });

  describe("generateAnnotation", () => {
    const setupGenerateAnnotationTest = () => {
      const mockContext = {
        workflow: { projectId: "test-project" },
        selectedNodeIds: ["node1", "node2"],
      };

      const stores = createStore();
      const { annotationInteractionsStore } = stores;

      vi.mocked(useHubLoginDialog).mockResolvedValue(HubLoginAction.LOGIN);

      vi.mocked(useAiContextBuilder).mockReturnValue({
        buildForQuickAction: vi.fn().mockReturnValue(mockContext),
      });

      // @ts-expect-error
      annotationInteractionsStore.getAnnotationBoundsForSelectedNodes = {
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      } as Bounds;
      annotationInteractionsStore.addWorkflowAnnotation = vi.fn();

      // Make the action available
      mockedAPI.kai.listQuickActions.mockResolvedValue({
        availableActions: [KaiQuickActionId.generateAnnotation],
      });

      return { ...stores, mockContext };
    };

    it("should successfully generate annotation", async () => {
      const {
        aiQuickActionsStore,
        annotationInteractionsStore,
        aiAssistantStore,
        mockContext,
      } = setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      const mockUsage = { used: 6, limit: 10 };
      const mockResponse = {
        result: {
          annotationText: "This is a generated annotation",
        },
        usage: mockUsage,
      };
      mockedAPI.kai.executeQuickAction.mockResolvedValue(mockResponse);

      await aiQuickActionsStore.generateAnnotation();
      await flushPromises();

      expect(mockedAPI.kai.executeQuickAction).toHaveBeenCalledWith({
        kaiQuickActionId: KaiQuickActionId.generateAnnotation,
        kaiQuickActionRequest: {
          actionId: KaiQuickActionId.generateAnnotation,
          projectId: "test-project-id",
          context: mockContext,
        },
      });

      expect(
        annotationInteractionsStore.addWorkflowAnnotation,
      ).toHaveBeenCalledWith({
        bounds: {
          x: 100,
          y: 70, // y - 30
          width: 200,
          height: 130, // height + 30
        },
        content: "This is a generated annotation",
      });

      // Verify usage was updated
      expect(aiAssistantStore.updateUsage).toHaveBeenCalledWith(mockUsage);
    });

    it("should prompt for login when user is not authenticated", async () => {
      const { aiQuickActionsStore } = createStore({
        isAuthenticated: false,
      });

      await aiQuickActionsStore.generateAnnotation();

      expect(useHubLoginDialog).toHaveBeenCalled();
    });

    it("should cancel if user declines login", async () => {
      const { aiQuickActionsStore } = createStore({
        isAuthenticated: false,
      });
      vi.mocked(useHubLoginDialog).mockResolvedValue(HubLoginAction.CANCEL);

      await aiQuickActionsStore.generateAnnotation();

      expect(mockedAPI.kai.executeQuickAction).not.toHaveBeenCalled();
    });

    it("should show warning when action is not available", async () => {
      const { aiQuickActionsStore, mockToastPresets } =
        setupGenerateAnnotationTest();

      // Mock the action as NOT available
      mockedAPI.kai.listQuickActions.mockResolvedValue({
        availableActions: [],
      });
      await aiQuickActionsStore.fetchAvailableQuickActions();

      await aiQuickActionsStore.generateAnnotation();

      expect(mockedAPI.kai.executeQuickAction).not.toHaveBeenCalled();
      expect(
        mockToastPresets.aiQuickActions.actionNotSupported,
      ).toHaveBeenCalledWith({
        hubId: "test-hub",
      });
    });

    it("should not start new generation if one is already in progress", async () => {
      const { aiQuickActionsStore } = setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      // Mock a slow API response that we can control
      let resolveFirst: any;
      mockedAPI.kai.executeQuickAction.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      );

      // Start first generation (don't await the full completion)
      const promise1 = aiQuickActionsStore.generateAnnotation();
      await flushPromises();

      // Verify state is "processing" (transitions from "waiting" -> "processing" after auth check)
      expect(
        aiQuickActionsStore.actionsStates[KaiQuickActionId.generateAnnotation]
          .status,
      ).toBe("processing");

      // Try to start second generation - should be blocked
      const promise2 = aiQuickActionsStore.generateAnnotation();

      // Complete the first request
      resolveFirst({
        result: { annotationText: "Generated annotation" },
        usage: { used: 6, limit: 10 },
      });

      await Promise.all([promise1, promise2]);

      // Should only call API once (second call was blocked)
      expect(mockedAPI.kai.executeQuickAction).toHaveBeenCalledTimes(1);

      // State should be back to idle
      expect(
        aiQuickActionsStore.actionsStates[KaiQuickActionId.generateAnnotation]
          .status,
      ).toBe("idle");
    });

    it("should reject annotation generation when filtered workflow has too many nodes", async () => {
      const { mockToastPresets, aiQuickActionsStore } =
        setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      // Mock the context builder to throw a VALIDATION_ERROR
      // (simulating user selecting nodes that are far apart, resulting in too many filtered nodes)
      const validationError = {
        message: JSON.stringify({
          detail: {
            code: KaiQuickActionError.CodeEnum.VALIDATIONERROR,
            message:
              "The number of nodes in the selected area is too large. Try annotating a smaller section of the workflow.",
          },
        }),
      };

      vi.mocked(useAiContextBuilder).mockReturnValue({
        buildForQuickAction: vi.fn().mockImplementation(() => {
          throw new Error(validationError.message);
        }),
      });

      await aiQuickActionsStore.generateAnnotation();

      // Should not call the API
      expect(mockedAPI.kai.executeQuickAction).not.toHaveBeenCalled();

      // Should show warning toast
      expect(
        mockToastPresets.aiQuickActions.validationError,
      ).toHaveBeenCalledWith({
        message:
          "The number of nodes in the selected area is too large. Try annotating a smaller section of the workflow.",
      });

      // State should be reset to idle
      expect(
        aiQuickActionsStore.actionsStates[KaiQuickActionId.generateAnnotation]
          .status,
      ).toBe("idle");
    });

    it("should handle LLM errors with retry", async () => {
      const { aiQuickActionsStore, annotationInteractionsStore } =
        setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      const mockError = {
        message: JSON.stringify({
          detail: {
            code: KaiQuickActionError.CodeEnum.LLMERROR,
            message: "LLM service error",
          },
        }),
      };

      // Fail once, then succeed
      mockedAPI.kai.executeQuickAction
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          result: {
            annotationText: "Generated after retry",
          },
        });

      await aiQuickActionsStore.generateAnnotation();
      await flushPromises();

      // Should have retried
      expect(mockedAPI.kai.executeQuickAction).toHaveBeenCalledTimes(2);
      expect(
        annotationInteractionsStore.addWorkflowAnnotation,
      ).toHaveBeenCalledWith({
        bounds: expect.any(Object),
        content: "Generated after retry",
      });
    });

    it("should show error toast after max retries", async () => {
      const { aiQuickActionsStore, mockToastPresets } =
        setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      const mockError = {
        message: JSON.stringify({
          detail: {
            code: KaiQuickActionError.CodeEnum.LLMERROR,
            message: "LLM service error",
          },
        }),
      };

      mockedAPI.kai.executeQuickAction.mockRejectedValue(mockError);

      await aiQuickActionsStore.generateAnnotation();

      expect(mockToastPresets.aiQuickActions.llmError).toHaveBeenCalledWith({
        message: "LLM service error",
      });
    });

    it("should handle authentication failed error", async () => {
      const { aiQuickActionsStore, mockToastPresets } =
        setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      const mockError = {
        message: JSON.stringify({
          detail: {
            code: KaiQuickActionError.CodeEnum.AUTHENTICATIONFAILED,
            message: "Authentication failed",
          },
        }),
      };

      mockedAPI.kai.executeQuickAction.mockRejectedValue(mockError);

      await aiQuickActionsStore.generateAnnotation();

      expect(
        mockToastPresets.aiQuickActions.authenticationFailed,
      ).toHaveBeenCalled();
      const callArgs = vi.mocked(
        mockToastPresets.aiQuickActions.authenticationFailed,
      ).mock.calls[0][0];
      expect(callArgs.message).toBe("Authentication failed");
      expect(callArgs.hubId).toBe("test-hub");
      expect(typeof callArgs.onLogin).toBe("function");
    });

    it("should handle quota exceeded error", async () => {
      const { aiQuickActionsStore, aiAssistantStore, mockToastPresets } =
        setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      const mockError = {
        message: JSON.stringify({
          detail: {
            code: KaiQuickActionError.CodeEnum.QUOTAEXCEEDED,
            message: "Quota exceeded",
          },
        }),
      };

      mockedAPI.kai.executeQuickAction.mockRejectedValue(mockError);

      await aiQuickActionsStore.generateAnnotation();

      // Verify usage was fetched after quota exceeded
      expect(aiAssistantStore.fetchUsage).toHaveBeenCalled();

      expect(
        mockToastPresets.aiQuickActions.quotaExceeded,
      ).toHaveBeenCalledWith({
        message: "Quota exceeded",
      });
    });

    it("should handle service unavailable error", async () => {
      const { aiQuickActionsStore, mockToastPresets } =
        setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      const mockError = {
        message: JSON.stringify({
          detail: {
            code: KaiQuickActionError.CodeEnum.SERVICEUNAVAILABLE,
            message: "Service unavailable",
          },
        }),
      };

      mockedAPI.kai.executeQuickAction.mockRejectedValue(mockError);

      await aiQuickActionsStore.generateAnnotation();

      expect(
        mockToastPresets.aiQuickActions.serviceUnavailable,
      ).toHaveBeenCalledWith({
        message: "Service unavailable",
      });
    });

    it("should handle timeout error", async () => {
      const { aiQuickActionsStore, mockToastPresets } =
        setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      const mockError = {
        message: JSON.stringify({
          detail: {
            code: KaiQuickActionError.CodeEnum.TIMEOUT,
            message: "Request timed out",
          },
        }),
      };

      mockedAPI.kai.executeQuickAction.mockRejectedValue(mockError);

      await aiQuickActionsStore.generateAnnotation();

      expect(mockToastPresets.aiQuickActions.timeout).toHaveBeenCalledWith({
        message: "Request timed out",
      });
    });

    it("should handle unknown errors", async () => {
      const { aiQuickActionsStore, mockToastPresets } =
        setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      const mockError = {
        message: "Unexpected error",
      };

      mockedAPI.kai.executeQuickAction.mockRejectedValue(mockError);

      await aiQuickActionsStore.generateAnnotation();

      expect(mockToastPresets.aiQuickActions.unknownError).toHaveBeenCalledWith(
        {
          message: "Unexpected error",
        },
      );
    });

    it("should reset state after generation completes", async () => {
      const { aiQuickActionsStore } = setupGenerateAnnotationTest();

      await aiQuickActionsStore.fetchAvailableQuickActions();

      mockedAPI.kai.executeQuickAction.mockResolvedValue({
        result: {
          annotationText: "Generated annotation",
        },
      });

      expect(
        aiQuickActionsStore.actionsStates[KaiQuickActionId.generateAnnotation]
          .status,
      ).toBe("idle");

      await aiQuickActionsStore.generateAnnotation();
      await flushPromises();

      expect(
        aiQuickActionsStore.actionsStates[KaiQuickActionId.generateAnnotation]
          .status,
      ).toBe("idle");
      expect(
        aiQuickActionsStore.actionsStates[KaiQuickActionId.generateAnnotation]
          .bounds,
      ).toBeNull();
    });
  });
});
