import { beforeEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";

import { rfcErrors } from "@knime/hub-features";

import { getToastsProvider } from "@/plugins/toasts";
import { getToastPresets } from "..";

vi.mock("@knime/hub-features", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    // @ts-expect-error
    ...actual,
    rfcErrors: {
      // @ts-expect-error
      ...actual.rfcErrors,
      toToast: vi.fn(),
    },
  };
});

describe("toastPresets", () => {
  const toastSetup = () => {
    const { toastPresets } = getToastPresets();
    const $toast = getToastsProvider();
    return { toastPresets, $toast };
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("application", () => {
    it("show show openProjectFailed toast", () => {
      const { toastPresets, $toast } = toastSetup();
      toastPresets.app.openProjectFailed({
        error: new Error("open failed ~~"),
      });

      expect($toast.show).toBeCalledWith({
        headline: "Could not open workflow",
        message: "The workflow might not exist anymore or be corrupted",
        type: "warning",
      });
    });
  });

  describe("connectivity", () => {
    it("should show hubSessionExpired toast", () => {
      const { toastPresets, $toast } = toastSetup();
      toastPresets.connectivity.hubSessionExpired();

      expect($toast.show).toBeCalledWith(
        expect.objectContaining({
          headline: "KNIME Hub session expired",
          message: "Please log in again to continue.",
          type: "error",
        }),
      );
    });

    it("should show connectionLoss toast", () => {
      const { toastPresets, $toast } = toastSetup();
      toastPresets.connectivity.connectionLoss();

      expect($toast.show).toBeCalledWith({
        autoRemove: false,
        headline: "Connection lost",
        message: "Check your internet connection and refresh the page.",
        type: "error",
      });
    });

    it("should show connectionRestored toast", () => {
      const { toastPresets, $toast } = toastSetup();
      toastPresets.connectivity.connectionRestored();

      expect($toast.remove).toBeCalled();

      expect($toast.show).toBeCalledWith({
        headline: "Connection restored",
        type: "success",
      });
    });
  });

  describe("spaces", () => {
    describe("auth", () => {
      it("show show connectFailed toast", () => {
        const { toastPresets, $toast } = toastSetup();
        toastPresets.spaces.auth.connectFailed({
          error: new Error("connect failed"),
          providerName: "some provider",
        });

        expect($toast.show).toBeCalledWith({
          headline: "Could not connect to some provider",
          message: "connect failed",
          type: "error",
        });
      });
    });

    describe("crud", () => {
      it.each([
        [
          "copyItemsFailed",
          "Error copying items",
          "actual copyItemsFailed error",
        ],
        [
          "createFolderFailed",
          "Create folder failed",
          "Error while creating folder",
        ],
        [
          "createWorkflowFailed",
          "Error creating workflow",
          "actual createWorkflowFailed error",
        ],
        [
          "deleteItemsFailed",
          "Error deleting items",
          "actual deleteItemsFailed error",
        ],
        [
          "fetchWorkflowGroupFailed",
          "Error while fetching workflow group content",
          "actual fetchWorkflowGroupFailed error",
        ],
        [
          "moveItemsFailed",
          "Error moving items",
          "actual moveItemsFailed error",
        ],
        [
          "reloadProviderSpacesFailed",
          "Error fetching provider spaces",
          "actual reloadProviderSpacesFailed error",
        ],
        [
          "renameItemFailed",
          "Rename failed",
          'Could not rename the selected item with the new name "undefined". actual renameItemFailed error',
        ],
        [
          "renameSpaceFailed",
          "Error while renaming space",
          "actual renameSpaceFailed error",
        ],
      ])("show %s toast", (method, headline, message) => {
        const { toastPresets, $toast } = toastSetup();
        toastPresets.spaces.crud[method]({
          error: new Error(`actual ${method} error`),
        });

        expect($toast.show).toBeCalledWith({
          headline,
          message,
          type: "error",
        });
      });

      it("handles fetchProviderSpaceGroupsFailed", () => {
        const { toastPresets } = toastSetup();
        const failedProviders = [
          {
            name: "Provider1",
            error: {
              code: -32600,
              data: {
                code: "SomeException",
                title: "",
                details: ["problem 1", "problem 2"],
              },
            },
          },
          {
            name: "Provider2",
            error: {
              code: -32600,
              data: {
                code: "SomeException",
                title: "",
                details: ["problem 3"],
              },
            },
          },
        ];

        toastPresets.spaces.crud.fetchProviderSpaceGroupsFailed({
          failedProviders,
        });

        const expectedRfcError = new rfcErrors.RFCError({
          title: "Could not load spaces for:\n- Provider1\n- Provider2",
          details: ["problem 1", "problem 2", "problem 3"],
        });

        expect(rfcErrors.toToast).toHaveBeenCalledWith(
          expect.objectContaining({
            headline: "Error fetching provider space groups",
            rfcError: expectedRfcError,
            canCopyToClipboard: true,
          }),
        );
      });

      it("should show moveOrCopyOpenItemsWarning", () => {
        const { toastPresets, $toast } = toastSetup();
        toastPresets.spaces.crud.moveOrCopyOpenItemsWarning({
          isCopy: false,
          component: h("div"),
        });

        expect($toast.show).toBeCalledWith({
          headline: "Could not move items",
          component: h("div"),
          type: "warning",
        });
      });
    });
  });
});
