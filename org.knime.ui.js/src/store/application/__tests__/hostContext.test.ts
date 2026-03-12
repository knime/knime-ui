import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { embeddingSDK } from "@knime/hub-features";

import { isBrowser, isDesktop } from "@/environment";
import { createWorkflow } from "@/test/factories";
import { mockEnvironment } from "@/test/utils/mockEnvironment";
import { mockStores } from "@/test/utils/mockStores";

vi.mock("@/environment");

vi.mock("@knime/hub-features", async () => {
  return {
    ...(await vi.importActual("@knime/hub-features")),
    embeddingSDK: {
      guest: {
        getContext: vi.fn(),
        dispatchGenericEventToHost: vi.fn(),
        notifyActivityChange: vi.fn(),
      },
    },
  };
});

const idle = ref(false);

vi.mock("@vueuse/core", async () => {
  return {
    ...(await vi.importActual("@vueuse/core")),
    useIdle: () => ({ idle }),
  };
});

describe("hostContext store", () => {
  const loadStore = ({ isProjectExecuting = false } = {}) => {
    const mockedStores = mockStores();
    const workflow = createWorkflow({ isProjectExecuting });
    mockedStores.workflowStore.setActiveWorkflow(workflow);

    return { ...mockedStores };
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("navigateHome", () => {
    it("does nothing on desktop", () => {
      mockEnvironment("DESKTOP", { isBrowser, isDesktop });
      const { hostContextStore } = loadStore();

      hostContextStore.navigateHome(false);
      expect(
        embeddingSDK.guest.dispatchGenericEventToHost,
      ).not.toHaveBeenCalled();
    });

    it("runs", () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });
      const { hostContextStore } = loadStore();

      hostContextStore.navigateHome(false);
      expect(
        embeddingSDK.guest.dispatchGenericEventToHost,
      ).toHaveBeenCalledWith({
        kind: "hostNavigationRequest",
        payload: {
          destination: "cloud-home",
          intent: "go-to",
          openIn: "_parent",
        },
      });
    });
  });

  describe("navigateToExternalUrl", () => {
    it("does nothing on desktop", () => {
      mockEnvironment("DESKTOP", { isBrowser, isDesktop });
      const { hostContextStore } = loadStore();

      hostContextStore.navigateToExternalUrl({
        url: "https://knime.com/hub/a/wf-id",
        openInNewTab: true,
      });

      expect(
        embeddingSDK.guest.dispatchGenericEventToHost,
      ).not.toHaveBeenCalled();
    });

    it("dispatches navigation event in browser", () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });
      const { hostContextStore } = loadStore();

      hostContextStore.navigateToExternalUrl({
        url: "https://knime.com/hub/a/wf-id",
        openInNewTab: true,
      });

      expect(
        embeddingSDK.guest.dispatchGenericEventToHost,
      ).toHaveBeenCalledWith({
        kind: "hostNavigationRequest",
        payload: {
          intent: "navigate",
          href: "https://knime.com/hub/a/wf-id",
          openIn: "_blank",
        },
      });
    });
  });

  describe("setupIdleTracking", () => {
    afterEach(() => {
      idle.value = false;
    });

    beforeEach(() => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });
      vi.mocked(embeddingSDK.guest.getContext).mockReturnValue({
        userIdleTimeout: 1000,
        jobId: "",
        restApiBaseUrl: "",
        wsConnectionUri: "",
      });
    });

    it("does nothing on desktop", () => {
      mockEnvironment("DESKTOP", { isBrowser, isDesktop });
      const { hostContextStore } = loadStore();

      hostContextStore.setupIdleTracking();
      expect(embeddingSDK.guest.getContext).not.toHaveBeenCalled();
      expect(embeddingSDK.guest.notifyActivityChange).not.toHaveBeenCalled();
    });

    it("does not allow calling setup twice", () => {
      const { hostContextStore } = loadStore();

      hostContextStore.setupIdleTracking();
      hostContextStore.setupIdleTracking();

      expect(embeddingSDK.guest.getContext).toHaveBeenCalledOnce();
    });

    it("notifies correct state", async () => {
      const { hostContextStore, workflowStore } = loadStore();
      hostContextStore.setupIdleTracking();

      // -- idle
      idle.value = true;
      workflowStore.activeWorkflow!.isProjectExecuting = false;

      await nextTick();
      expect(embeddingSDK.guest.notifyActivityChange).toHaveBeenCalledWith({
        lastActive: expect.any(String),
        state: "idle",
        version: "v1",
      });

      // -- active
      idle.value = false;
      workflowStore.activeWorkflow!.isProjectExecuting = false;

      await nextTick();
      expect(embeddingSDK.guest.notifyActivityChange).toHaveBeenCalledWith({
        lastActive: expect.any(String),
        state: "active",
        version: "v1",
      });

      // -- background-task
      idle.value = false;
      workflowStore.activeWorkflow!.isProjectExecuting = true;

      await nextTick();
      expect(embeddingSDK.guest.notifyActivityChange).toHaveBeenCalledWith({
        lastActive: expect.any(String),
        state: "background-task",
        version: "v1",
      });

      // -- background-task
      idle.value = true;
      workflowStore.activeWorkflow!.isProjectExecuting = true;

      await nextTick();
      expect(embeddingSDK.guest.notifyActivityChange).toHaveBeenCalledWith({
        lastActive: expect.any(String),
        state: "background-task",
        version: "v1",
      });
    });

    it("notifies state when background sessions cannot be kept", async () => {
      const { hostContextStore, workflowStore, uiControlsStore } = loadStore();
      uiControlsStore.canKeepEditSessionInBackground = false;
      hostContextStore.setupIdleTracking();

      // -- idle
      idle.value = true;
      workflowStore.activeWorkflow!.isProjectExecuting = false;

      await nextTick();
      expect(embeddingSDK.guest.notifyActivityChange).toHaveBeenCalledWith({
        lastActive: expect.any(String),
        idle: true,
        version: "v0",
      });

      // -- active
      idle.value = false;
      workflowStore.activeWorkflow!.isProjectExecuting = false;

      await nextTick();
      expect(embeddingSDK.guest.notifyActivityChange).toHaveBeenCalledWith({
        lastActive: expect.any(String),
        idle: false,
        version: "v0",
      });

      // -- background-task
      idle.value = false;
      workflowStore.activeWorkflow!.isProjectExecuting = true;

      await nextTick();
      expect(embeddingSDK.guest.notifyActivityChange).toHaveBeenLastCalledWith({
        lastActive: expect.any(String),
        idle: false,
        version: "v0",
      });
    });
  });
});
