import { afterEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { UnsavedChangesAction } from "@/composables/confirmDialogs/useUnsavedChangesDialog";
import { deepMocked } from "@/test/utils";
import type { PageBuilderApi } from "../compositeView";
import { showPageBuilderUnsavedChangesDialog } from "../showPageBuilderUnsavedChangesDialog";

let useUnsavedChangesDialogMock = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      action: UnsavedChangesAction.CANCEL,
      doNotAskAgain: false,
    }),
  ),
);
vi.mock(
  import("@/composables/confirmDialogs/useUnsavedChangesDialog"),
  async (importOriginal) => {
    const mod = await importOriginal();
    return { ...mod, useUnsavedChangesDialog: useUnsavedChangesDialogMock };
  },
);

let mockAskToConfirm = vi.hoisted(() => true);
vi.mock("@/store/application/application", () => ({
  useApplicationStore: () => ({
    askToConfirmNodeConfigChanges: mockAskToConfirm,
  }),
}));

const mockedAPI = deepMocked(API);

mockedAPI.desktop.setConfirmNodeConfigChangesPreference.mockImplementation(
  vi.fn(() => Promise.resolve()),
);

const activePageBuilder = {
  applyAndExecute: vi.fn(() => Promise.resolve()),
} as unknown as PageBuilderApi;

describe("showPageBuilderUnsavedChangesDialog", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("auto-saves and returns 'canContinue' when askToConfirm is false", async () => {
    mockAskToConfirm = false;
    const result = await showPageBuilderUnsavedChangesDialog(activePageBuilder);

    expect(result).toBeTruthy();
    expect(useUnsavedChangesDialogMock).not.toHaveBeenCalled();
    expect(activePageBuilder.applyAndExecute).toHaveBeenCalled();
    expect(
      API.desktop.setConfirmNodeConfigChangesPreference,
    ).not.toHaveBeenCalled();
  });

  it("shows unsaved changes dialog when askToConfirm is true", async () => {
    // `askToConfirm` will stay mocked as `true` for the following tests
    mockAskToConfirm = true;
    await showPageBuilderUnsavedChangesDialog(activePageBuilder);

    expect(useUnsavedChangesDialogMock).toHaveBeenCalled();
  });

  it("saves changes without saving preference when user confirms", async () => {
    useUnsavedChangesDialogMock.mockResolvedValue({
      action: UnsavedChangesAction.SAVE,
      doNotAskAgain: false,
    });
    const result = await showPageBuilderUnsavedChangesDialog(activePageBuilder);

    expect(result).toBeTruthy();
    expect(activePageBuilder.applyAndExecute).toHaveBeenCalled();
    expect(
      API.desktop.setConfirmNodeConfigChangesPreference,
    ).not.toHaveBeenCalled();
  });

  it("saves preference and saves changes when 'doNotAskAgain' is checked", async () => {
    useUnsavedChangesDialogMock.mockResolvedValue({
      action: UnsavedChangesAction.SAVE,
      doNotAskAgain: true,
    });

    const result = await showPageBuilderUnsavedChangesDialog(activePageBuilder);

    expect(result).toBeTruthy();
    expect(
      API.desktop.setConfirmNodeConfigChangesPreference,
    ).toHaveBeenCalledWith(false);
    expect(activePageBuilder.applyAndExecute).toHaveBeenCalled();
  });

  it("returns 'canContinue' without saving when user discards changes", async () => {
    useUnsavedChangesDialogMock.mockResolvedValue({
      action: UnsavedChangesAction.DISCARD,
      doNotAskAgain: false,
    });

    const result = await showPageBuilderUnsavedChangesDialog(activePageBuilder);

    expect(result).toBeTruthy();
    expect(activePageBuilder.applyAndExecute).not.toHaveBeenCalled();
  });

  it("returns 'abort' when user cancels the dialog", async () => {
    useUnsavedChangesDialogMock.mockResolvedValue({
      action: UnsavedChangesAction.CANCEL,
      doNotAskAgain: false,
    });

    const result = await showPageBuilderUnsavedChangesDialog(activePageBuilder);

    expect(result).toBeFalsy();
    expect(activePageBuilder.applyAndExecute).not.toHaveBeenCalled();
  });
});
