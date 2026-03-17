import { beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { runInEnvironment } from "@/environment";
import { createSpaceProvider } from "@/test/factories/spaces";
import { deepMocked } from "@/test/utils";
import { mockStores } from "@/test/utils/mockStores";

const connectFailedMock = vi.hoisted(() => vi.fn());

vi.mock("@/environment");
vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-router")>()),
  useRouter: vi.fn(),
}));
vi.mock("@/services/toastPresets", () => ({
  getToastPresets: () => ({
    toastPresets: {
      spaces: {
        auth: {
          connectFailed: connectFailedMock,
        },
      },
    },
  }),
}));

const mockedAPI = deepMocked(API);

describe("aiProvider store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runInEnvironment).mockImplementation(
      (matcher: any) => matcher.DESKTOP?.(),
    );
  });

  const HUB_ID = "test-hub";

  const setupStore = ({
    hubId = HUB_ID,
    connected = false,
  }: {
    hubId?: string | null;
    connected?: boolean;
  } = {}) => {
    const {
      aiProviderStore,
      spaceProvidersStore,
      spaceAuthStore,
      aiAssistantStore,
    } = mockStores();

    if (hubId) {
      spaceProvidersStore.spaceProviders = {
        [hubId]: createSpaceProvider({
          id: hubId,
          connected,
          name: "Test Hub",
          username: "test-user",
        }),
      };
    }

    mockedAPI.desktop.getHubID.mockResolvedValue(hubId);

    spaceAuthStore.connectProvider = vi.fn();
    spaceAuthStore.disconnectProvider = vi.fn();
    aiAssistantStore.fetchUsage = vi.fn();

    return {
      aiProviderStore,
      spaceProvidersStore,
      spaceAuthStore,
      aiAssistantStore,
    };
  };

  describe("aiProviderStatus", () => {
    it("is 'unconfigured' when no AI provider ID is set", async () => {
      const { aiProviderStore } = setupStore({ hubId: null });

      await aiProviderStore.fetchAiProviderId();

      expect(aiProviderStore.aiProviderStatus).toBe("unconfigured");
    });

    it("is 'backendUnavailable' when configured but backend has not been checked yet", async () => {
      const { aiProviderStore } = setupStore();

      await aiProviderStore.fetchAiProviderId();

      expect(aiProviderStore.aiProviderStatus).toBe("backendUnavailable");
    });

    it("is 'checkingBackend' while fetching UI strings", async () => {
      const { aiProviderStore } = setupStore();

      await aiProviderStore.fetchAiProviderId();
      mockedAPI.kai.getUiStrings.mockReturnValue(new Promise(() => {}));
      aiProviderStore.fetchUiStrings();

      expect(aiProviderStore.aiProviderStatus).toBe("checkingBackend");
    });

    it("is 'backendUnavailable' after UI strings fetch fails", async () => {
      const { aiProviderStore } = setupStore();

      await aiProviderStore.fetchAiProviderId();
      mockedAPI.kai.getUiStrings.mockRejectedValue(new Error("unavailable"));
      await aiProviderStore.fetchUiStrings();

      expect(aiProviderStore.aiProviderStatus).toBe("backendUnavailable");
    });

    it("is 'backendAvailable' when backend is available but user is not logged in", async () => {
      const { aiProviderStore } = setupStore({ connected: false });

      await aiProviderStore.fetchAiProviderId();
      mockedAPI.kai.getUiStrings.mockResolvedValue({});
      await aiProviderStore.fetchUiStrings();

      expect(aiProviderStore.aiProviderStatus).toBe("backendAvailable");
    });

    it("is 'ready' when backend is available and user is logged in", async () => {
      const { aiProviderStore } = setupStore({ connected: true });

      await aiProviderStore.fetchAiProviderId();
      mockedAPI.kai.getUiStrings.mockResolvedValue({});
      await aiProviderStore.fetchUiStrings();

      expect(aiProviderStore.aiProviderStatus).toBe("ready");
    });
  });

  describe("fetchAiProviderId", () => {
    it("fetches the provider ID from the desktop API", async () => {
      const { aiProviderStore } = setupStore({ hubId: "my-hub" });

      await aiProviderStore.fetchAiProviderId();

      expect(aiProviderStore.aiProviderId).toBe("my-hub");
    });

    it("caches the result and does not re-fetch on subsequent calls", async () => {
      const { aiProviderStore } = setupStore({ hubId: "my-hub" });

      await aiProviderStore.fetchAiProviderId();
      await aiProviderStore.fetchAiProviderId();

      expect(mockedAPI.desktop.getHubID).toHaveBeenCalledTimes(1);
    });

    it("re-fetches when called with force: true", async () => {
      const { aiProviderStore } = setupStore({ hubId: "hub-1" });

      await aiProviderStore.fetchAiProviderId();

      mockedAPI.desktop.getHubID.mockResolvedValue("hub-2");
      await aiProviderStore.fetchAiProviderId({ force: true });

      expect(mockedAPI.desktop.getHubID).toHaveBeenCalledTimes(2);
      expect(aiProviderStore.aiProviderId).toBe("hub-2");
    });

    it("returns the same promise for concurrent calls", async () => {
      const { aiProviderStore } = setupStore({ hubId: "my-hub" });

      aiProviderStore.fetchAiProviderId();
      aiProviderStore.fetchAiProviderId();

      await aiProviderStore.fetchAiProviderId();
      expect(mockedAPI.desktop.getHubID).toHaveBeenCalledTimes(1);
    });

    it("sets aiProviderId to null when the API returns null", async () => {
      const { aiProviderStore } = setupStore({ hubId: null });

      await aiProviderStore.fetchAiProviderId();

      expect(aiProviderStore.aiProviderId).toBeNull();
    });
  });

  describe("fetchUiStrings", () => {
    it("fetches UI strings and updates provider status on success", async () => {
      const { aiProviderStore } = setupStore();
      const uiStrings = { kaiGreeting: "Hello!" };

      await aiProviderStore.fetchAiProviderId();
      mockedAPI.kai.getUiStrings.mockResolvedValue(uiStrings);
      await aiProviderStore.fetchUiStrings();

      expect(aiProviderStore.aiProviderStatus).toBe("backendAvailable");
      expect(aiProviderStore.uiStrings).toMatchObject(uiStrings);
    });

    it("marks backend as unavailable on failure", async () => {
      const { aiProviderStore } = setupStore();

      await aiProviderStore.fetchAiProviderId();
      mockedAPI.kai.getUiStrings.mockRejectedValue(new Error("fail"));
      await aiProviderStore.fetchUiStrings();

      expect(aiProviderStore.aiProviderStatus).toBe("backendUnavailable");
    });

    it("caches the result and does not re-fetch on subsequent calls", async () => {
      const { aiProviderStore } = setupStore();

      await aiProviderStore.fetchAiProviderId();
      mockedAPI.kai.getUiStrings.mockResolvedValue({});
      await aiProviderStore.fetchUiStrings();
      await aiProviderStore.fetchUiStrings();

      expect(mockedAPI.kai.getUiStrings).toHaveBeenCalledTimes(1);
    });

    it("re-fetches when called with force: true", async () => {
      const { aiProviderStore } = setupStore();

      await aiProviderStore.fetchAiProviderId();
      mockedAPI.kai.getUiStrings.mockResolvedValue({});
      await aiProviderStore.fetchUiStrings();
      await aiProviderStore.fetchUiStrings({ force: true });

      expect(mockedAPI.kai.getUiStrings).toHaveBeenCalledTimes(2);
    });

    it("returns the same promise for concurrent calls", async () => {
      const { aiProviderStore } = setupStore();

      await aiProviderStore.fetchAiProviderId();
      mockedAPI.kai.getUiStrings.mockResolvedValue({});
      aiProviderStore.fetchUiStrings();
      aiProviderStore.fetchUiStrings();

      await aiProviderStore.fetchUiStrings();
      expect(mockedAPI.kai.getUiStrings).toHaveBeenCalledTimes(1);
    });
  });

  describe("connectAiProvider", () => {
    it("connects the provider via spaceAuth", async () => {
      const { aiProviderStore, spaceAuthStore } = setupStore();

      await aiProviderStore.connectAiProvider();

      expect(spaceAuthStore.connectProvider).toHaveBeenCalledWith({
        spaceProviderId: HUB_ID,
      });
    });

    it("fetches usage after connecting", async () => {
      const { aiProviderStore, aiAssistantStore } = setupStore();

      await aiProviderStore.connectAiProvider();

      expect(aiAssistantStore.fetchUsage).toHaveBeenCalled();
    });

    it("does not connect when no provider ID is available", async () => {
      const { aiProviderStore, spaceAuthStore } = setupStore({ hubId: null });

      await aiProviderStore.connectAiProvider();

      expect(spaceAuthStore.connectProvider).not.toHaveBeenCalled();
    });

    it("shows a toast when connection fails", async () => {
      const { aiProviderStore, spaceAuthStore } = setupStore();

      const error = new Error("connection failed");
      spaceAuthStore.connectProvider = vi.fn().mockRejectedValue(error);
      await aiProviderStore.connectAiProvider();

      expect(connectFailedMock).toHaveBeenCalledWith({
        error,
        providerName: "Test Hub",
      });
    });
  });

  describe("disconnectAiProvider", () => {
    it("disconnects from the provider via spaceAuth", async () => {
      const { aiProviderStore, spaceAuthStore } = setupStore();

      await aiProviderStore.disconnectAiProvider();

      expect(spaceAuthStore.disconnectProvider).toHaveBeenCalledWith(
        expect.objectContaining({ spaceProviderId: HUB_ID }),
      );
    });

    it("does not disconnect when no provider ID is available", async () => {
      const { aiProviderStore, spaceAuthStore } = setupStore({ hubId: null });

      await aiProviderStore.disconnectAiProvider();

      expect(spaceAuthStore.disconnectProvider).not.toHaveBeenCalled();
    });
  });

  describe("licensingStatus", () => {
    it("defaults to licensed", () => {
      const { aiProviderStore } = setupStore();

      expect(aiProviderStore.licensingStatus).toEqual({ licensed: true });
    });

    it("can be marked as unlicensed with a message", () => {
      const { aiProviderStore } = setupStore();

      aiProviderStore.markUserAsUnlicensed("No license available");

      expect(aiProviderStore.licensingStatus).toEqual({
        licensed: false,
        unlicensedMessage: "No license available",
      });
    });

    it("can be marked back as licensed", () => {
      const { aiProviderStore } = setupStore();

      aiProviderStore.markUserAsUnlicensed("No license");
      aiProviderStore.markUserAsLicensed();

      expect(aiProviderStore.licensingStatus).toEqual({ licensed: true });
    });
  });

  describe("usernameForAiProvider", () => {
    it("returns the username from the matching space provider", async () => {
      const { aiProviderStore } = setupStore({ connected: true });

      await aiProviderStore.fetchAiProviderId();

      expect(aiProviderStore.usernameForAiProvider).toBe("test-user");
    });

    it("returns null when no provider matches", () => {
      const { aiProviderStore } = setupStore({ hubId: null });

      expect(aiProviderStore.usernameForAiProvider).toBeNull();
    });
  });
});
