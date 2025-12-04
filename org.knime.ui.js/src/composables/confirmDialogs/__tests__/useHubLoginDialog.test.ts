import { afterEach, describe, expect, it, vi } from "vitest";

import { mockStores } from "@/test/utils/mockStores";
import { HubLoginAction, useHubLoginDialog } from "../useHubLoginDialog";

const askConfirmationMock = vi.hoisted(() => vi.fn());
const closeConfirmDialogMock = vi.hoisted(() => vi.fn());
const connectFailedToastMock = vi.hoisted(() => vi.fn());

vi.mock("@knime/kds-components", async (importOriginal) => {
  const original = await importOriginal();

  return {
    // @ts-expect-error test
    ...original,
    useKdsDynamicModal: () => ({
      askConfirmation: askConfirmationMock,
      close: closeConfirmDialogMock,
    }),
  };
});

vi.mock("@/toastPresets", () => ({
  getToastPresets: () => ({
    toastPresets: {
      spaces: {
        auth: {
          connectFailed: connectFailedToastMock,
        },
      },
    },
  }),
}));

describe("useHubLoginDialog", () => {
  const config = {
    title: "Log in required",
    message: "Please log in.",
    hubId: "example-hub",
  };

  const setupStores = () => {
    const stores = mockStores();

    stores.spaceProvidersStore.spaceProviders = {
      // @ts-expect-error
      "example-hub": { name: "Example Hub" },
    };

    return stores;
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("shows the confirm dialog of the correct configuration", async () => {
    setupStores();

    askConfirmationMock.mockResolvedValue({ confirmed: false });

    await useHubLoginDialog(config);

    expect(askConfirmationMock).toHaveBeenCalledTimes(1);
    const [arg] = askConfirmationMock.mock.calls[0];
    expect(arg.title).toBe(config.title);
    expect(arg.message).toBe(config.message);
    expect(Array.isArray(arg.buttons)).toBe(true);
    expect(arg.buttons).toHaveLength(2);

    const [cancelBtn, confirmBtn] = arg.buttons;
    expect(cancelBtn).toMatchObject({ type: "cancel", label: "Not now" });
    expect(confirmBtn.type).toBe("confirm");
    expect(confirmBtn.label).toBe("Log in to Example Hub");
  });

  it("returns LOGIN and connects to provider when dialog is confirmed", async () => {
    const { spaceAuthStore } = setupStores();

    askConfirmationMock.mockResolvedValue({ confirmed: true });
    vi.spyOn(spaceAuthStore, "connectProvider").mockResolvedValue({
      isConnected: false,
      providerData: null,
    });

    const result = await useHubLoginDialog(config);

    expect(result).toBe(HubLoginAction.LOGIN);
    expect(spaceAuthStore.connectProvider).toHaveBeenCalledTimes(1);
    expect(spaceAuthStore.connectProvider).toHaveBeenCalledWith({
      spaceProviderId: config.hubId,
    });
  });

  it("returns CANCEL and does not connect to provider when dialog is not confirmed", async () => {
    const { spaceAuthStore } = setupStores();

    askConfirmationMock.mockResolvedValue({ confirmed: false });
    const connectProviderSpy = vi.spyOn(spaceAuthStore, "connectProvider");

    const result = await useHubLoginDialog(config);

    expect(result).toBe(HubLoginAction.CANCEL);
    expect(connectProviderSpy).not.toHaveBeenCalled();
  });

  it("returns ERROR and shows toast when connectProvider fails", async () => {
    const { spaceAuthStore } = setupStores();
    const error = new Error("Authentication failed");

    askConfirmationMock.mockResolvedValue({ confirmed: true });
    vi.spyOn(spaceAuthStore, "connectProvider").mockRejectedValue(error);

    const result = await useHubLoginDialog(config);

    expect(result).toBe(HubLoginAction.ERROR);
    expect(closeConfirmDialogMock).toHaveBeenCalledTimes(1);
    expect(connectFailedToastMock).toHaveBeenCalledTimes(1);
    expect(connectFailedToastMock).toHaveBeenCalledWith({
      error,
      providerName: "Example Hub",
    });
  });

  it("returns ERROR and uses hubId as fallback when provider name is not found", async () => {
    const { spaceAuthStore } = setupStores();
    const error = new Error("Authentication failed");
    const unknownHubConfig = {
      ...config,
      hubId: "unknown-hub",
    };

    askConfirmationMock.mockResolvedValue({ confirmed: true });
    vi.spyOn(spaceAuthStore, "connectProvider").mockRejectedValue(error);

    const result = await useHubLoginDialog(unknownHubConfig);

    expect(result).toBe(HubLoginAction.ERROR);
    expect(closeConfirmDialogMock).toHaveBeenCalledTimes(1);
    expect(connectFailedToastMock).toHaveBeenCalledTimes(1);
    expect(connectFailedToastMock).toHaveBeenCalledWith({
      error,
      providerName: "unknown-hub",
    });
  });
});
