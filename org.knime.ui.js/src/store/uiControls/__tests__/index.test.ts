import { describe, expect, it } from "vitest";
import { mockVuexStore } from "@/test/utils";
import { setEnvironment } from "@/test/utils/setEnvironment";
import { AppState } from "@/api/gateway-api/generated-api";
import * as applicationStore from "../../application";

describe("uiControls", () => {
  const loadStore = async (mode?: AppState.AppModeEnum) => {
    const $store = mockVuexStore({
      application: applicationStore,
      uiControls: await import("../index"),
    });

    $store.commit("application/setAppMode", mode);

    return { $store };
  };

  describe("default mode", () => {
    it("desktop", async () => {
      setEnvironment("DESKTOP");

      const { $store } = await loadStore(AppState.AppModeEnum.Default);
      $store.dispatch("uiControls/init");

      expect($store.state.uiControls).toEqual({
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

      const { $store } = await loadStore(AppState.AppModeEnum.Default);
      $store.dispatch("uiControls/init");

      expect($store.state.uiControls).toEqual({
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

      const { $store } = await loadStore(AppState.AppModeEnum.Playground);
      $store.state.application.analyticsPlatformDownloadURL =
        "http://example.com";
      $store.dispatch("uiControls/init");

      expect($store.state.uiControls).toEqual({
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

      const { $store } = await loadStore(AppState.AppModeEnum.JobViewer);
      $store.dispatch("uiControls/init");

      expect($store.state.uiControls).toEqual({
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
