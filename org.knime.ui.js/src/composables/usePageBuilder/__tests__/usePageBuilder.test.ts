// usePageBuilder.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isBrowser, isDesktop } from "@/environment";
import type * as UsePageBuilderModule from "../usePageBuilder";

const mockUrl = vi.hoisted(() => "mocked-url");

vi.mock("@/components/uiExtensions/common/useResourceLocation", () => ({
  resourceLocationResolver: vi.fn(() => mockUrl),
}));

vi.mock("@/environment", () => ({
  isBrowser: vi.fn(),
  isDesktop: vi.fn(),
}));

vi.mock("../pageBuilderStore", () => ({
  pageBuilderApiVuexStoreConfig: { state: {}, actions: {} },
}));

const mockPromptApplyConfirmation = vi.hoisted(vi.fn);

vi.mock("../pageBuilderPromptApply", () => ({
  promptConfirmationAndApply: mockPromptApplyConfirmation,
}));

const mockPageBuilderControl = {
  mountShadowApp: vi.fn(),
  loadPage: vi.fn(() => Promise.resolve()),
  isDirty: vi.fn(() => Promise.resolve(false)),
  hasPage: vi.fn(() => false),
  updateAndReexecute: vi.fn(() => Promise.resolve()),
  unmountShadowApp: vi.fn(),
};

const mockCreatePageBuilder = vi.fn(() =>
  Promise.resolve(mockPageBuilderControl),
);

describe("usePageBuilder", () => {
  let usePageBuilder: typeof UsePageBuilderModule.usePageBuilder,
    clickAwayCompositeView: typeof UsePageBuilderModule.clickAwayCompositeView;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock(mockUrl, () => ({ createPageBuilderApp: mockCreatePageBuilder }));

    const mod = await import("../usePageBuilder");
    usePageBuilder = mod.usePageBuilder;
    clickAwayCompositeView = mod.clickAwayCompositeView;

    vi.resetAllMocks();

    vi.mocked(isDesktop).mockReturnValue(true);
    vi.mocked(isBrowser).mockReturnValue(false);
  });

  it("should initialize PageBuilder with correct environment", async () => {
    await usePageBuilder("project-123", vi.fn());

    expect(mockCreatePageBuilder).toHaveBeenCalledWith(
      expect.objectContaining({
        state: { disallowWebNodes: false, disableWidgetsWhileExecuting: true },
      }),
      "mocked-url",
    );

    expect((window as any).process.env.NODE_ENV).toBe(import.meta.env.NODE_ENV);
  });

  it("should handle dirty state through UI interactions", async () => {
    await usePageBuilder("project-123", vi.fn());

    mockPageBuilderControl.isDirty.mockResolvedValueOnce(true);
    mockPromptApplyConfirmation.mockResolvedValueOnce(false);

    const result = await clickAwayCompositeView();
    expect(result).toBeFalsy();
  });

  it("should continue if no active PageBuilder is set", async () => {
    mockPageBuilderControl.isDirty.mockResolvedValueOnce(true);
    mockPromptApplyConfirmation.mockResolvedValueOnce(false);

    const result = await clickAwayCompositeView();
    expect(result).toBeTruthy();
  });

  it("should allow continuation when not dirty", async () => {
    await usePageBuilder("project-123", vi.fn());
    mockPageBuilderControl.isDirty.mockResolvedValueOnce(false);

    const result = await clickAwayCompositeView();
    expect(result).toBeTruthy();
  });
});
