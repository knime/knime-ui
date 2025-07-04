import { beforeAll, describe, expect, it, vi } from "vitest";

import { $bus } from "@/plugins/event-bus";
import * as desktopAPI from "../desktop-api";

type BrowserFunctionDescriptor = {
  name: string;
  desktopApiName?: string;
  params?: Iterable<Readonly<[key: string, value: any]>>;
  flattenParams?: boolean;
  returnValue?: any;
  blocksUi?: boolean;
};

const browserFunctions: BrowserFunctionDescriptor[] = [
  { name: "switchToJavaUI" },
  { name: "switchWorkspace", blocksUi: true },
  { name: "openAboutDialog", blocksUi: true },
  { name: "openUpdateDialog", blocksUi: true },
  { name: "openKNIMEHomeDir" },
  { name: "checkForUpdates" },
  { name: "openUrlInExternalBrowser", params: [["url", "http://www.url.com"]] },
  { name: "openInstallExtensionsDialog" },
  { name: "openWebUIPreferencePage", blocksUi: true },
  { name: "openWorkflowCoachPreferencePage", blocksUi: true },
  {
    name: "openNodeDialog",
    params: [
      ["projectId", "project1"],
      ["versionId", "current-state"],
      ["nodeId", "1"],
    ],
    blocksUi: true,
  },
  {
    name: "openLinkComponentDialog",
    params: [
      ["projectId", "project1"],
      ["workflowId", "root"],
      ["nodeId", "1"],
    ],
    blocksUi: true,
  },
  {
    name: "openChangeComponentHubItemVersionDialog",
    params: [
      ["projectId", "project1"],
      ["workflowId", "root"],
      ["nodeId", "1"],
    ],
    blocksUi: true,
  },
  {
    name: "openChangeComponentLinkTypeDialog",
    params: [
      ["projectId", "project1"],
      ["workflowId", "root"],
      ["nodeId", "1"],
    ],
    blocksUi: true,
  },
  {
    name: "openLegacyFlowVariableDialog",
    params: [
      ["projectId", "project1"],
      ["nodeId", "1"],
    ],
    blocksUi: true,
  },
  {
    name: "executeNodeAndOpenView",
    params: [
      ["projectId", "project1"],
      ["nodeId", "1"],
    ],
  },
  {
    name: "openPortView",
    params: [
      ["projectId", "project1"],
      ["nodeId", "1"],
      ["portIndex", 1],
      ["viewIndex", 1],
    ],
  },
  {
    name: "saveProject",
    params: [
      ["projectId", "project1"],
      ["workflowPreviewSvg", "<svg></svg>"],
      ["allowOverwritePrompt", false],
    ],
    returnValue: true,
    blocksUi: true,
  },
  {
    name: "openProject",
    params: [
      ["spaceId", "space1"],
      ["itemId", "123"],
      ["spaceProviderId", "provider1"],
    ],
    blocksUi: true,
  },
  {
    name: "closeProject",
    params: [
      ["closingProjectId", "1"],
      ["nextProjectId", "1"],
    ],
    returnValue: true,
    blocksUi: true,
  },
  {
    name: "forceCloseProjects",
    params: [["projectIds", ["1", "2", "3"]]],
    flattenParams: true,
  },
  {
    name: "setProjectActiveAndEnsureItsLoaded",
    params: [
      ["projectId", "1"],
      ["versionId", "current-state"],
      ["removeProjectIfNotLoaded", "true"],
    ],
    blocksUi: true,
  },
  {
    name: "openLayoutEditor",
    params: [
      ["projectId", "project1"],
      ["workflowId", "workflow1"],
    ],
    blocksUi: true,
  },
  {
    name: "connectSpaceProvider",
    params: [["spaceProviderId", "1"]],
    returnValue: JSON.stringify({
      id: "1",
      name: "Space Provider",
      connected: true,
      connectionMode: "AUTHENTICATED",
      local: false,
      spaces: [],
      user: { name: "user" },
    }),
    blocksUi: true,
  },
  {
    name: "disconnectSpaceProvider",
    params: [["spaceProviderId", "1"]],
  },
  {
    name: "importFiles",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
    blocksUi: true,
  },
  {
    name: "importWorkflows",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
    blocksUi: true,
  },
  {
    name: "exportSpaceItem",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
    blocksUi: true,
  },
  {
    name: "getNameCollisionStrategy",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemIds", ["123"]],
      ["destinationItemId", "hub1"],
      ["usageContext", "MOVE"],
    ],
    returnValue: "NOOP",
  },
  {
    name: "downloadFromSpace",
    params: [
      ["sourceProviderId", "provider1"],
      ["sourceSpaceId", "space1"],
      ["sourceItemIds", ["123", "456"]],
      ["destinationProviderId", "provider2"],
      ["destinationSpaceId", "space2"],
      ["destinationItemId", "123"],
    ],
    blocksUi: true,
  },
  {
    name: "uploadToSpace",
    params: [
      ["sourceProviderId", "provider1"],
      ["sourceSpaceId", "space1"],
      ["sourceItemIds", ["123", "456"]],
      ["destinationProviderId", "provider2"],
      ["destinationSpaceId", "space2"],
      ["destinationItemId", "123"],
      ["excludeData", false],
    ],
    blocksUi: true,
  },
  {
    name: "openInBrowser",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
      ["queryString", undefined],
    ],
  },
  {
    name: "saveProjectAs",
    params: [
      ["projectId", "project1"],
      ["workflowPreviewSvg", "<svg></svg>"],
    ],
    blocksUi: true,
  },
  {
    name: "importComponent",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
      ["projectId", "project1"],
      ["workflowId", "root"],
      ["x", 10],
      ["y", 10],
    ],
    blocksUi: true,
  },
  {
    name: "saveAndCloseProjects",
    params: [
      ["totalProjects", 2],
      ["projectIds", ["project1", "project2"]],
      ["svgSnapshots", ["<svg>1</svg>", "<svg>2</svg>"]],
      ["params", []],
    ],
    flattenParams: true,
    blocksUi: true,
  },
  {
    name: "importURIAtWorkflowCanvas",
    params: [
      ["uri", "random-uri"],
      ["projectId", "project1"],
      ["workflowId", "workflow1"],
      ["x", 10],
      ["y", 10],
    ],
    blocksUi: true,
  },
  {
    name: "openLegacyPortView",
    params: [
      ["projectId", "project1"],
      ["nodeId", "root:1"],
      ["portIdx", 0],
      ["executeNode", false],
    ],
  },
  {
    name: "openAPIDefinition",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
  },
  {
    name: "openPermissionsDialog",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
    blocksUi: true,
  },
  {
    name: "executeOnClassic",
    desktopApiName: "executeWorkflow",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
  },
  {
    name: "saveJobAsWorkflow",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
      ["jobId", "job123"],
      ["jobName", "myJob"],
    ],
    returnValue: "spaceItemEntId",
    blocksUi: true,
  },
  {
    name: "editSchedule",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
      ["scheduleId", "mySchedule"],
    ],
    returnValue: "scheduledJobInfoId",
    blocksUi: true,
  },
  {
    name: "removeMostRecentlyUsedProject",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
  },
  {
    name: "updateMostRecentlyUsedProject",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
      ["newName", "newProjectName"],
    ],
  },
];

describe("desktop-api", () => {
  beforeAll(() => {
    browserFunctions.forEach(({ name: fn, returnValue }) => {
      window[fn] = returnValue ? vi.fn(() => returnValue) : vi.fn();
    });
  });

  it.each(browserFunctions)(
    "calls %s",
    async ({
      name,
      desktopApiName,
      params = [],
      flattenParams,
      returnValue,
      blocksUi,
    }) => {
      const paramsAsObj = Object.fromEntries(new Map(params));

      const mappingFn = ([_, value]: readonly [string, any]) => value;

      const paramValues = flattenParams
        ? [...params].flatMap(mappingFn)
        : [...params].map(mappingFn);

      const busOnSpy = vi.spyOn($bus, "on");
      const busEmitSpy = vi.spyOn($bus, "emit");

      const result = desktopAPI[desktopApiName || name](paramsAsObj);

      expect(busOnSpy).toHaveBeenCalledWith(
        "desktop-api-function-result-spy",
        expect.anything(),
      );

      expect(window[name]).toHaveBeenCalledWith(...paramValues);
      if (blocksUi) {
        expect(busEmitSpy).toHaveBeenCalledTimes(1);
        expect(busEmitSpy).toHaveBeenCalledWith("block-ui", expect.any(Object));
      } else {
        expect(busEmitSpy).toHaveBeenCalledTimes(0);
      }

      // test promise
      let resolved = false;
      result.then(() => (resolved = true));
      expect(resolved).toBe(false);

      $bus.emit("desktop-api-function-result-spy", {
        name: "desktop-api-function-result-spy",
        result: returnValue ? true : null,
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(resolved).toBe(true);

      if (blocksUi) {
        expect(busEmitSpy).toHaveBeenCalledTimes(3); // block-ui, desktop-api-function-result-spy, unblock-ui
        expect(busEmitSpy).toHaveBeenNthCalledWith(3, "unblock-ui");
      } else {
        expect(busEmitSpy).toHaveBeenCalledTimes(1); // explicitly emitted above "desktop-api-function-result-spy"
      }
    },
  );
});
