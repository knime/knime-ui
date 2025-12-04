import { afterEach, describe, expect, it, vi } from "vitest";

import {
  UnsavedChangesAction,
  useUnsavedChangesDialog,
} from "../useUnsavedChangesDialog";

let askConfirmationMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ confirmed: true, doNotAskAgain: false })),
);
vi.mock("@knime/kds-components", () => ({
  useKdsDynamicModal: () => ({ askConfirmation: askConfirmationMock }),
}));

describe("useUnsavedChangesDialog", () => {
  const config = { title: "", message: "", doNotAskAgain: { label: "" } };

  afterEach(vi.resetAllMocks);

  it("should resolve correctly when saving", async () => {
    const { action } = await useUnsavedChangesDialog(config);

    expect(action).toBe(UnsavedChangesAction.SAVE);
  });

  it("should resolve correctly when discarding", async () => {
    askConfirmationMock = vi.fn().mockImplementation((options) => {
      const discardButton = options.buttons.find(
        ({ label }) => label === "Discard changes",
      );
      discardButton.customHandler({ cancel: vi.fn() });
      return { confirmed: false, doNotAskAgain: false };
    });

    const { action } = await useUnsavedChangesDialog(config);

    expect(action).toBe(UnsavedChangesAction.DISCARD);
  });

  it("should resolve correctly when cancelling", async () => {
    askConfirmationMock.mockResolvedValue({
      confirmed: false,
      doNotAskAgain: false,
    });

    const { action } = await useUnsavedChangesDialog(config);

    expect(action).toBe(UnsavedChangesAction.CANCEL);
  });

  it("should forward doNotAskAgain value from useKdsDynamicModal", async () => {
    askConfirmationMock.mockResolvedValue({
      confirmed: true,
      doNotAskAgain: true,
    });

    const { doNotAskAgain } = await useUnsavedChangesDialog(config);

    expect(doNotAskAgain).toBe(true);
  });
});
