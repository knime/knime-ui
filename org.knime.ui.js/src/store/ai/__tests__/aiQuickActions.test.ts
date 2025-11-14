import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, nextTick, ref } from "vue";
import { API } from "@api";

import { useHubAuth } from "@/components/kai/useHubAuth";
import {
  HubLoginAction,
  useHubLoginDialog,
} from "@/composables/confirmDialogs/useHubLoginDialog";
import { useAiQuickActionContext } from "@/composables/useAiQuickActionContext/useAiQuickActionContext";
import { useIsKaiEnabled } from "@/composables/useIsKaiEnabled";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";
import { QuickActionId } from "../types";

const mockedAPI = deepMocked(API);

vi.mock("@/components/kai/useHubAuth");
vi.mock("@/composables/useIsKaiEnabled");
vi.mock("@/composables/confirmDialogs/useHubLoginDialog");
vi.mock("@/composables/useAiQuickActionContext/useAiQuickActionContext");

describe("aiQuickActions store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupStore = ({
    isAuthenticated = false,
    hubId = "Test Hub",
    availableQuickActions = [],
    projectId = "test-project-id",
    isKaiEnabled = true,
    isUserLicensed = true,
  }: {
    isAuthenticated?: boolean;
    hubId?: string;
    availableQuickActions?: string[];
    projectId?: string;
    isKaiEnabled?: boolean;
    isUserLicensed?: boolean;
  } = {}) => {
    const isAuthenticatedRef = ref(isAuthenticated);
    const isAuthenticatedComputed = computed(() => isAuthenticatedRef.value);
    const hubIdRef = ref(hubId);
    const isUserLicensedRef = ref(isUserLicensed);
    // @ts-expect-error Partial mock
    vi.mocked(useHubAuth).mockReturnValue({
      isAuthenticated: isAuthenticatedComputed,
      hubID: hubIdRef,
      isUserLicensed: isUserLicensedRef,
    });

    const isKaiEnabledRef = ref(isKaiEnabled);
    vi.mocked(useIsKaiEnabled).mockReturnValue({
      isKaiEnabled: isKaiEnabledRef,
    });

    mockedAPI.kai.listQuickActions.mockResolvedValue({
      availableActions: availableQuickActions,
    });

    const {
      selectionStore,
      annotationInteractionsStore,
      applicationStore,
      aiQuickActionsStore,
    } = mockStores();

    applicationStore.activeProjectId = projectId;

    return {
      selectionStore,
      annotationInteractionsStore,
      applicationStore,
      aiQuickActionsStore,
      isAuthenticatedRef,
      hubIdRef,
      isKaiEnabledRef,
      isUserLicensedRef,
    };
  };

  describe("store initialisation", () => {
    it("should initialise correctly", () => {
      const { aiQuickActionsStore } = setupStore();

      expect(aiQuickActionsStore.processingActions).toEqual({});
    });
  });

  describe("fetchAvailableQuickActions", () => {
    it("should fetch available quick actions if user authenticates", async () => {
      const { isAuthenticatedRef } = setupStore();

      // trigger auth watcher
      isAuthenticatedRef.value = true;
      await nextTick();

      expect(mockedAPI.kai.listQuickActions).toHaveBeenCalled();
    });

    it("should reset action list when user logs out", async () => {
      const { isAuthenticatedRef, aiQuickActionsStore } = setupStore({
        availableQuickActions: [QuickActionId.GenerateAnnotation],
      });

      // trigger auth watcher to fetch list of actions
      isAuthenticatedRef.value = true;
      await nextTick();

      expect(aiQuickActionsStore.availableQuickActions).not.toBeNull();

      // trigger auth watcher with a logged-out event
      isAuthenticatedRef.value = false;
      await nextTick();

      expect(aiQuickActionsStore.availableQuickActions).toBeNull();
    });

    it("should reset action list when Hub ID changes", async () => {
      const { isAuthenticatedRef, hubIdRef, aiQuickActionsStore } = setupStore({
        availableQuickActions: [QuickActionId.GenerateAnnotation],
      });

      // trigger auth watcher to fetch list of actions
      isAuthenticatedRef.value = true;
      await nextTick();

      expect(aiQuickActionsStore.availableQuickActions).not.toBeNull();

      // trigger auth watcher with a logged-out event
      hubIdRef.value = "blip";
      await nextTick();

      expect(aiQuickActionsStore.availableQuickActions).toBeNull();
    });

    it("should handle fetch error gracefully", async () => {
      const { isAuthenticatedRef, aiQuickActionsStore } = setupStore();

      mockedAPI.kai.listQuickActions.mockRejectedValue(
        new Error("Network error"),
      );

      // trigger auth watcher
      isAuthenticatedRef.value = true;
      await nextTick();

      // Should set availableQuickActions to empty array on error (not null)
      expect(aiQuickActionsStore.availableQuickActions).toEqual([]);
    });

    it("should not fetch when no active project", async () => {
      const { isAuthenticatedRef } = setupStore({ projectId: "" });

      // trigger auth watcher
      isAuthenticatedRef.value = true;
      await nextTick();

      expect(mockedAPI.kai.listQuickActions).not.toHaveBeenCalled();
    });
  });

  describe("authentication handling", () => {
    it("should handle authenticated state correctly", async () => {
      const { aiQuickActionsStore } = setupStore({
        isAuthenticated: true,
        availableQuickActions: [QuickActionId.GenerateAnnotation],
      });

      const result = await aiQuickActionsStore.ensureAuthenticated();

      expect(result).toBe(true);
      expect(mockedAPI.kai.listQuickActions).toHaveBeenCalled();
      expect(useHubLoginDialog).not.toHaveBeenCalled();
    });

    it("should handle unauthenticated state", async () => {
      vi.mocked(useHubLoginDialog).mockResolvedValue(HubLoginAction.CANCEL);

      const { aiQuickActionsStore } = setupStore({
        isAuthenticated: false,
      });

      const result = await aiQuickActionsStore.ensureAuthenticated();

      expect(result).toBe(false);
      expect(useHubLoginDialog).toHaveBeenCalled();
    });

    it("should show login dialog when user is not authenticated", async () => {
      vi.mocked(useHubLoginDialog).mockResolvedValue(HubLoginAction.LOGIN);

      const { aiQuickActionsStore } = setupStore({
        isAuthenticated: false,
        hubId: "Test Hub",
        availableQuickActions: [QuickActionId.GenerateAnnotation],
      });

      const result = await aiQuickActionsStore.ensureAuthenticated();

      expect(useHubLoginDialog).toHaveBeenCalledWith({
        title: "Log in to KNIME Hub",
        message: expect.stringContaining("Log in with your KNIME Hub account"),
        hubId: "Test Hub",
      });
      expect(result).toBe(true);
      expect(mockedAPI.kai.listQuickActions).toHaveBeenCalled();
    });
  });

  describe("generateAnnotation", () => {
    const setupSelection = ({
      isAuthenticated = true,
      availableQuickActions = [QuickActionId.GenerateAnnotation],
      selectedNodeIds = ["node1", "node2"],
      bounds = { x: 0, y: 0, width: 100, height: 100 },
    } = {}) => {
      const stores = setupStore({
        isAuthenticated,
        availableQuickActions,
      });

      // @ts-expect-error
      stores.selectionStore.selectedNodeIds = selectedNodeIds;
      // @ts-expect-error
      stores.annotationInteractionsStore.getAnnotationBoundsForSelectedNodes =
        bounds;
      stores.annotationInteractionsStore.addWorkflowAnnotationWithContent =
        vi.fn();

      vi.mocked(useAiQuickActionContext).mockReturnValue({
        selectedNodeIds,
      });

      return {
        ...stores,
        selectedNodeIds,
        bounds,
      };
    };

    it("should generate annotation successfully", async () => {
      const { aiQuickActionsStore, annotationInteractionsStore, bounds } =
        setupSelection();

      const mockAnnotationText = "Generated annotation text";

      mockedAPI.kai.executeQuickAction.mockResolvedValue({
        result: {
          annotationText: mockAnnotationText,
        },
      });

      await aiQuickActionsStore.generateAnnotation();

      expect(
        annotationInteractionsStore.addWorkflowAnnotationWithContent,
      ).toHaveBeenCalledWith({
        bounds,
        content: mockAnnotationText,
      });
    });

    it("should handle authentication failure during generation", async () => {
      const { aiQuickActionsStore, annotationInteractionsStore } =
        setupSelection({ isAuthenticated: false });

      vi.mocked(useHubLoginDialog).mockResolvedValue(HubLoginAction.CANCEL);

      await aiQuickActionsStore.generateAnnotation();

      expect(mockedAPI.kai.executeQuickAction).not.toHaveBeenCalled();
      expect(
        annotationInteractionsStore.addWorkflowAnnotationWithContent,
      ).not.toHaveBeenCalled();
    });

    it("should handle API execution errors", async () => {
      const { aiQuickActionsStore } = setupSelection();

      const mockError = new Error(
        JSON.stringify({
          detail: {
            code: "LLMERROR",
            message: "LLM service failed",
          },
        }),
      );

      mockedAPI.kai.executeQuickAction.mockRejectedValue(mockError);

      await expect(aiQuickActionsStore.generateAnnotation()).rejects.toThrow();
    });
  });

  describe("isQuickActionAvailable", () => {
    it("should return false when K-AI is not enabled", () => {
      const { aiQuickActionsStore } = setupStore({ isKaiEnabled: false });

      const result = aiQuickActionsStore.isQuickActionAvailable(
        QuickActionId.GenerateAnnotation,
      );

      expect(result).toBe(false);
    });

    it("should return true when actions not fetched yet (optimistic)", () => {
      const { aiQuickActionsStore } = setupStore({ isKaiEnabled: true });

      expect(aiQuickActionsStore.availableQuickActions).toBeNull();

      const result = aiQuickActionsStore.isQuickActionAvailable(
        QuickActionId.GenerateAnnotation,
      );

      expect(result).toBe(true);
    });

    it("should return true when action is available and not processing", async () => {
      const { aiQuickActionsStore, isAuthenticatedRef } = setupStore({
        isKaiEnabled: true,
        isAuthenticated: false,
        availableQuickActions: [QuickActionId.GenerateAnnotation],
      });

      // Trigger fetch by authenticating
      isAuthenticatedRef.value = true;
      await nextTick();

      const result = aiQuickActionsStore.isQuickActionAvailable(
        QuickActionId.GenerateAnnotation,
      );

      expect(result).toBe(true);
    });

    it("should return false when action is not in available actions list", async () => {
      const { aiQuickActionsStore, isAuthenticatedRef } = setupStore({
        isKaiEnabled: true,
        isAuthenticated: false,
        availableQuickActions: [],
      });

      // Trigger fetch by authenticating
      isAuthenticatedRef.value = true;
      await nextTick();

      const result = aiQuickActionsStore.isQuickActionAvailable(
        QuickActionId.GenerateAnnotation,
      );

      expect(result).toBe(false);
    });

    it("should return false when user is not licensed (e.g. a consumer)", () => {
      const { aiQuickActionsStore } = setupStore({ isUserLicensed: false });

      const result = aiQuickActionsStore.isQuickActionAvailable(
        QuickActionId.GenerateAnnotation,
      );

      expect(result).toBe(false);
    });
  });
});
