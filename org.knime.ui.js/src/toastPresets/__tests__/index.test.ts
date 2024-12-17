import { beforeEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";

import { getToastsProvider } from "@/plugins/toasts";
import { getToastPresets } from "..";

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
    it("should show networkProblem toast ", () => {
      const { toastPresets, $toast } = toastSetup();
      toastPresets.connectivity.networkProblem();

      expect($toast.show).toBeCalledWith(
        expect.objectContaining({
          headline: "Connectivity problem",
          message: "Check you network connection",
          type: "error",
        }),
      );
    });

    it("should show connectionLoss toast ", () => {
      const { toastPresets, $toast } = toastSetup();
      toastPresets.connectivity.connectionLoss();

      expect($toast.show).toBeCalledWith({
        autoRemove: false,
        headline: "Connection lost",
        id: "__CONNECTION_LOSTCONNECTION_LOST",
        message: "Check your internet connection and refresh the page.",
        type: "error",
      });
    });

    it("should show connectionRestored toast ", () => {
      const { toastPresets, $toast } = toastSetup();
      toastPresets.connectivity.connectionRestored();

      expect($toast.removeBy).toBeCalled();

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
          message: "Could not connect to some provider",
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
          "fetchProviderSpacesFailed",
          "Error fetching provider spaces",
          "actual fetchProviderSpacesFailed error",
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
          'Could not rename the selected item to "undefined". Try again later.',
        ],
        [
          "renameSpaceFailed",
          "Error while renaming space",
          "actual renameSpaceFailed error",
        ],
      ])("show show %s toast", (method, headline, message) => {
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
