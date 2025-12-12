import { describe, expect, it, vi } from "vitest";

import { AppState } from "@/api/gateway-api/generated-api";
import { isBrowser, isDesktop } from "@/environment";
import { mockEnvironment } from "@/test/utils/mockEnvironment";

vi.mock("@/environment");

describe("uiControls", () => {
  const loadStore = async (mode: AppState.AppModeEnum) => {
    const { mockStores } = await import("@/test/utils/mockStores");
    const mockedStores = mockStores();

    mockedStores.applicationStore.setAppMode(mode);

    return { mockedStores };
  };

  describe("default mode", () => {
    it("desktop", async () => {
      mockEnvironment("DESKTOP", { isBrowser, isDesktop });

      const { mockedStores } = await loadStore(AppState.AppModeEnum.Default);

      expect(mockedStores.uiControlsStore.$state).toEqual({
        canAccessKAIPanel: true,
        canAccessNodeRepository: true,
        canAccessSpaceExplorer: true,
        canConfigureFlowVariables: true,
        canConfigureNodes: true,
        canDetachNodeViews: true,
        canDetachPortViews: true,
        canDoComponentSharingOperations: true,
        canDoAdvancedComponentSharingOperations: true,
        canEditWorkflow: true,
        canViewVersions: true,
        canLockAndUnlockSubnodes: true,
        canOpenLayoutEditor: true,
        canOpenLegacyPortViews: true,
        isKAISupported: true,
        isLocalSaveSupported: true,
        shouldDisplayDownloadAPButton: false,
        canReExecuteCompositeViews: true,
        shouldDisplayRemoteWorkflowInfoBar: true,
      });
    });

    it("browser", async () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });

      const { mockedStores } = await loadStore(AppState.AppModeEnum.Default);

      expect(mockedStores.uiControlsStore.$state).toEqual({
        canAccessKAIPanel: true,
        canAccessNodeRepository: true,
        canAccessSpaceExplorer: true,
        canConfigureFlowVariables: false,
        canConfigureNodes: true,
        canDetachNodeViews: false,
        canDetachPortViews: false,
        canDoComponentSharingOperations: true,
        canDoAdvancedComponentSharingOperations: false,
        canEditWorkflow: true,
        canViewVersions: true,
        canLockAndUnlockSubnodes: false,
        canOpenLayoutEditor: true,
        canOpenLegacyPortViews: false,
        isKAISupported: true,
        isLocalSaveSupported: false,
        shouldDisplayDownloadAPButton: false,
        canReExecuteCompositeViews: true,
        shouldDisplayRemoteWorkflowInfoBar: false,
      });
    });
  });

  describe("playground mode", () => {
    it("browser", async () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });

      const { mockedStores } = await loadStore(AppState.AppModeEnum.Playground);
      mockedStores.applicationStore.analyticsPlatformDownloadURL =
        "http://example.com";

      mockedStores.uiControlsStore.init();

      expect(mockedStores.uiControlsStore.$state).toEqual({
        canAccessKAIPanel: true,
        canAccessNodeRepository: true,
        canAccessSpaceExplorer: false,
        canConfigureFlowVariables: false,
        canConfigureNodes: true,
        canDetachNodeViews: false,
        canDetachPortViews: false,
        canDoComponentSharingOperations: false,
        canDoAdvancedComponentSharingOperations: false,
        canEditWorkflow: true,
        canViewVersions: false,
        canLockAndUnlockSubnodes: false,
        canOpenLayoutEditor: true,
        canOpenLegacyPortViews: false,
        isKAISupported: false,
        isLocalSaveSupported: false,
        shouldDisplayDownloadAPButton: true,
        canReExecuteCompositeViews: true,
        shouldDisplayRemoteWorkflowInfoBar: false,
      });
    });
  });

  describe("jobviewer mode", () => {
    it("browser", async () => {
      mockEnvironment("BROWSER", { isBrowser, isDesktop });

      const { mockedStores } = await loadStore(AppState.AppModeEnum.JobViewer);

      mockedStores.uiControlsStore.init();

      expect(mockedStores.uiControlsStore.$state).toEqual({
        canAccessKAIPanel: false,
        canAccessNodeRepository: false,
        canAccessSpaceExplorer: false,
        canConfigureFlowVariables: false,
        canConfigureNodes: false,
        canDetachNodeViews: false,
        canDetachPortViews: false,
        canDoComponentSharingOperations: false,
        canDoAdvancedComponentSharingOperations: false,
        canEditWorkflow: false,
        canViewVersions: false,
        canLockAndUnlockSubnodes: false,
        canOpenLayoutEditor: false,
        canOpenLegacyPortViews: false,
        isKAISupported: false,
        isLocalSaveSupported: false,
        shouldDisplayDownloadAPButton: false,
        canReExecuteCompositeViews: false,
        shouldDisplayRemoteWorkflowInfoBar: false,
      });
    });
  });
});
