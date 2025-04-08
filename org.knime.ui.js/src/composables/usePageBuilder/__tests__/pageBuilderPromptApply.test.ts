import { beforeEach, describe, expect, it, vi } from "vitest";

import { API } from "@/api/__mocks__";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import type { PageBuilderControl } from "@/composables/usePageBuilder/usePageBuilder";
import { promptConfirmationAndApply } from "../pageBuilderPromptApply";

let mockPromptResult = vi.hoisted(() => ({
  confirmed: true,
  doNotAskAgain: false,
}));

let mockShow = vi.hoisted(() => vi.fn(() => Promise.resolve(mockPromptResult)));

vi.mock("@/composables/useConfirmDialog", () => ({
  useConfirmDialog: vi.fn(() => ({
    show: mockShow,
  })),
}));

let mockAskToConfirm = vi.hoisted(() => true);
vi.mock("@/store/application/application", () => ({
  useApplicationStore: () => ({
    askToConfirmNodeConfigChanges: mockAskToConfirm,
  }),
}));

API.desktop.setConfirmNodeConfigChangesPreference.mockImplementation(
  vi.fn(() => Promise.resolve()),
);

const activePageBuilder = {
  updateAndReexecute: vi.fn(() => Promise.resolve()),
} as unknown as PageBuilderControl;

describe("promptApplyConfirmation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("auto-applies and returns 'canContinue' when askToConfirm is false", async () => {
    mockAskToConfirm = false;
    const result = await promptConfirmationAndApply(activePageBuilder);

    expect(result).toBeTruthy();
    expect(mockShow).not.toHaveBeenCalled();
    expect(activePageBuilder.updateAndReexecute).toHaveBeenCalled();
    expect(
      API.desktop.setConfirmNodeConfigChangesPreference,
    ).not.toHaveBeenCalled();
  });

  it("applies changes without saving preference when user confirms", async () => {
    mockAskToConfirm = true;
    const result = await promptConfirmationAndApply(activePageBuilder);

    expect(result).toBeTruthy();
    expect(mockShow).toHaveBeenCalled();
    expect(activePageBuilder.updateAndReexecute).toHaveBeenCalled();
    expect(
      API.desktop.setConfirmNodeConfigChangesPreference,
    ).not.toHaveBeenCalled();
  });

  it("saves preference and applies when 'doNotAskAgain' is checked", async () => {
    mockPromptResult = {
      confirmed: true,
      doNotAskAgain: true,
    };

    const result = await promptConfirmationAndApply(activePageBuilder);

    expect(result).toBeTruthy();
    expect(
      API.desktop.setConfirmNodeConfigChangesPreference,
    ).toHaveBeenCalledWith(false);
    expect(activePageBuilder.updateAndReexecute).toHaveBeenCalled();
  });

  it.todo(
    "returns 'canContinue' without applying when user discards changes",
    () => {},
  );

  it("returns 'abort' when user cancels the dialog", async () => {
    vi.mocked(useConfirmDialog().show).mockResolvedValueOnce({
      confirmed: false,
      doNotAskAgain: false,
    });

    const result = await promptConfirmationAndApply(activePageBuilder);

    expect(result).toBeFalsy();
    expect(activePageBuilder.updateAndReexecute).not.toHaveBeenCalled();
  });
});
