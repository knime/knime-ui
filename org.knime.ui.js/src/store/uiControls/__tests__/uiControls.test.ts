import { describe, expect, it } from "vitest";

import { AppState } from "@/api/gateway-api/generated-api";
import { setEnvironment } from "@/test/utils/setEnvironment";

describe("uiControls", () => {
  const loadStore = async (mode: AppState.AppModeEnum) => {
    const { mockStores } = await import("@/test/utils/mockStores");
    const mockedStores = mockStores();

    mockedStores.applicationStore.setAppMode(mode);

    return { mockedStores };
  };

  describe("default mode", () => {
    it("desktop", async () => {
      setEnvironment("DESKTOP");

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
        canEditWorkflow: true,
        canLockAndUnlockSubnodes: true,
        canOpenComponentLayoutEditor: true,
        canOpenLegacyPortViews: true,
        isKAISupported: true,
        isLocalSaveSupported: true,
        shouldDisplayDownloadAPButton: false,
        shouldDisplayRemoteWorkflowInfoBar: true,
      });
    });

    it("browser", async () => {
      setEnvironment("BROWSER");

      const { mockedStores } = await loadStore(AppState.AppModeEnum.Default);

      expect(mockedStores.uiControlsStore.$state).toEqual({
        canAccessKAIPanel: true,
        canAccessNodeRepository: true,
        canAccessSpaceExplorer: false,
        canConfigureFlowVariables: false,
        canConfigureNodes: true,
        canDetachNodeViews: false,
        canDetachPortViews: false,
        canDoComponentSharingOperations: false,
        canEditWorkflow: true,
        canLockAndUnlockSubnodes: false,
        canOpenComponentLayoutEditor: false,
        canOpenLegacyPortViews: false,
        isKAISupported: true,
        isLocalSaveSupported: false,
        shouldDisplayDownloadAPButton: false,
        shouldDisplayRemoteWorkflowInfoBar: false,
      });
    });
  });

  describe("playground mode", () => {
    it("browser", async () => {
      setEnvironment("BROWSER");

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
        canEditWorkflow: true,
        canLockAndUnlockSubnodes: false,
        canOpenComponentLayoutEditor: false,
        canOpenLegacyPortViews: false,
        isKAISupported: false,
        isLocalSaveSupported: false,
        shouldDisplayDownloadAPButton: true,
        shouldDisplayRemoteWorkflowInfoBar: false,
      });
    });
  });

  describe("jobviewer mode", () => {
    it("browser", async () => {
      setEnvironment("BROWSER");

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
        canEditWorkflow: false,
        canLockAndUnlockSubnodes: false,
        canOpenComponentLayoutEditor: false,
        canOpenLegacyPortViews: false,
        isKAISupported: false,
        isLocalSaveSupported: false,
        shouldDisplayDownloadAPButton: false,
        shouldDisplayRemoteWorkflowInfoBar: false,
      });
    });
  });
});
