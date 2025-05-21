// usePageBuilder.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { isBrowser, isDesktop } from "@/environment";
import type * as UsePageBuilderModule from "../usePageBuilder";
import {
  type PageBuilderControl,
  isCompositeViewDirty,
} from "../usePageBuilder";

const mockUrl = vi.hoisted(() => "mocked-url");

const mockExecutionStore = vi.hoisted(() => ({
  changeNodeState: vi.fn(() => Promise.resolve()),
  executeNodes: vi.fn(),
}));

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

vi.mock("@/store/workflow/execution", () => ({
  useExecutionStore: vi.fn(() => mockExecutionStore),
}));

const showPageBuilderUnsavedChangesDialogMock = vi.hoisted(vi.fn);

vi.mock("../showPageBuilderUnsavedChangesDialog", () => ({
  showPageBuilderUnsavedChangesDialog: showPageBuilderUnsavedChangesDialogMock,
}));

const someProjectId = "some-project-id";
const someNodeId = "node-123";

const mockPageBuilderControl: PageBuilderControl = {
  mountShadowApp: vi.fn(),
  loadPage: vi.fn(() => Promise.resolve()),
  isDirty: vi.fn(() => Promise.resolve(false)),
  isDefault: vi.fn(() => Promise.resolve(true)),
  hasPage: vi.fn(() => false),
  updateAndReexecute: vi.fn(() => Promise.resolve()),
  applyToDefaultAndExecute: vi.fn(() => Promise.resolve()),
  unmountShadowApp: vi.fn(),
};

const mockCreatePageBuilder = vi.fn(() =>
  Promise.resolve(mockPageBuilderControl),
);

describe("usePageBuilder", () => {
  let usePageBuilder: typeof UsePageBuilderModule.usePageBuilder,
    clickAwayCompositeView: typeof UsePageBuilderModule.clickAwayCompositeView,
    applyAndExecute: typeof UsePageBuilderModule.applyAndExecute,
    applyToDefaultAndExecute: typeof UsePageBuilderModule.applyToDefaultAndExecute,
    resetToDefaults: typeof UsePageBuilderModule.resetToDefaults;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock(mockUrl, () => ({ createPageBuilderApp: mockCreatePageBuilder }));

    const mod = await import("../usePageBuilder");
    usePageBuilder = mod.usePageBuilder;
    clickAwayCompositeView = mod.clickAwayCompositeView;
    applyAndExecute = mod.applyAndExecute;
    applyToDefaultAndExecute = mod.applyToDefaultAndExecute;
    resetToDefaults = mod.resetToDefaults;

    vi.resetAllMocks();

    vi.mocked(isDesktop).mockReturnValue(true);
    vi.mocked(isBrowser).mockReturnValue(false);
  });

  it("should initialize PageBuilder with correct environment", async () => {
    await usePageBuilder(someProjectId);

    expect(mockCreatePageBuilder).toHaveBeenCalledWith(
      expect.objectContaining({
        state: {
          disallowWebNodes: true,
          disableWidgetsWhileExecuting: true,
          alwaysTearDownKnimePageBuilderAPI: true,
        },
      }),
      mockUrl,
    );

    expect((window as any).process.env.NODE_ENV).toBe(import.meta.env.NODE_ENV);
  });

  it("mounts and unmounts the PageBuilder app correctly", async () => {
    const { mountShadowApp, unmountShadowApp } = await usePageBuilder(
      someProjectId,
    );
    await mountShadowApp("shadow-root" as any);

    expect(mockPageBuilderControl.mountShadowApp).toHaveBeenCalled();
    expect(isCompositeViewDirty.value).toBe(false);
    expect(mockPageBuilderControl.hasPage()).toBe(false);

    unmountShadowApp();
    expect(mockPageBuilderControl.unmountShadowApp).toHaveBeenCalled();
  });

  it("should handle dirty state through UI interactions", async () => {
    await usePageBuilder(someProjectId);

    mockPageBuilderControl.isDirty.mockResolvedValueOnce(true);
    showPageBuilderUnsavedChangesDialogMock.mockResolvedValueOnce(false);

    const result = await clickAwayCompositeView();
    expect(result).toBeFalsy();
  });

  it("should continue if no active PageBuilder is set", async () => {
    mockPageBuilderControl.isDirty.mockResolvedValueOnce(true);
    showPageBuilderUnsavedChangesDialogMock.mockResolvedValueOnce(false);

    const result = await clickAwayCompositeView();
    expect(result).toBeTruthy();
  });

  it("should allow continuation when not dirty", async () => {
    await usePageBuilder(someProjectId);
    mockPageBuilderControl.isDirty.mockResolvedValueOnce(false);

    const result = await clickAwayCompositeView();
    expect(result).toBeTruthy();
  });

  it("should not execute when PageBuilder is not mounted", async () => {
    await usePageBuilder(someProjectId);
    await applyAndExecute();
    expect(mockPageBuilderControl.updateAndReexecute).not.toHaveBeenCalled();
  });

  it("should not execute when not dirty", async () => {
    await usePageBuilder(someProjectId);
    mockPageBuilderControl.isDirty.mockResolvedValue(false);
    await applyAndExecute();
    expect(mockPageBuilderControl.updateAndReexecute).not.toHaveBeenCalled();
  });

  it("should not execute when no page exists", async () => {
    await usePageBuilder(someProjectId);
    mockPageBuilderControl.isDirty.mockResolvedValue(true);
    mockPageBuilderControl.hasPage.mockReturnValue(false);
    await applyAndExecute();
    expect(mockPageBuilderControl.updateAndReexecute).not.toHaveBeenCalled();
  });

  it("should execute when conditions are met", async () => {
    await usePageBuilder(someProjectId);
    mockPageBuilderControl.isDirty.mockResolvedValue(true);
    mockPageBuilderControl.hasPage.mockReturnValue(true);
    await applyAndExecute();
    expect(mockPageBuilderControl.updateAndReexecute).toHaveBeenCalled();
  });

  it("should not execute when PageBuilder not ready", async () => {
    await usePageBuilder(someProjectId);
    await applyToDefaultAndExecute(someNodeId);
    expect(mockExecutionStore.executeNodes).not.toHaveBeenCalled();
  });

  it("should apply as default and execute when conditions are met", async () => {
    await usePageBuilder(someProjectId);
    mockPageBuilderControl.hasPage.mockReturnValue(true);
    await applyToDefaultAndExecute(someNodeId);
    expect(mockExecutionStore.executeNodes).toHaveBeenCalledWith([someNodeId]);
  });

  it("should reset node when PageBuilder is active", async () => {
    await usePageBuilder(someProjectId);
    await resetToDefaults(someNodeId);
    expect(mockExecutionStore.changeNodeState).toHaveBeenCalledWith({
      action: "reset",
      nodes: [someNodeId],
    });
    expect(mockExecutionStore.executeNodes).toHaveBeenCalledWith([someNodeId]);
  });
});
