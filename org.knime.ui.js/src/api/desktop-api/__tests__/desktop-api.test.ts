import { beforeAll, describe, expect, it, vi } from "vitest";

import { $bus } from "@/plugins/event-bus";
import { API } from "../../index";

type BrowserFunctionDescriptor = {
  name: string;
  desktopApiName?: string;
  params?: Iterable<Readonly<[key: string, value: any]>>;
  flattenParams?: boolean;
  returnValue?: any;
};

const browserFunctions: BrowserFunctionDescriptor[] = [
  { name: "switchToJavaUI" },
  { name: "switchWorkspace" },
  { name: "openAboutDialog" },
  { name: "openUpdateDialog" },
  { name: "openKNIMEHomeDir" },
  { name: "checkForUpdates" },
  { name: "openUrlInExternalBrowser", params: [["url", "http://www.url.com"]] },
  { name: "openInstallExtensionsDialog" },
  { name: "openWebUIPreferencePage" },
  { name: "openWorkflowCoachPreferencePage" },
  {
    name: "openNodeDialog",
    params: [
      ["projectId", "project1"],
      ["nodeId", "1"],
    ],
  },
  {
    name: "openLinkComponentDialog",
    params: [
      ["projectId", "project1"],
      ["workflowId", "root"],
      ["nodeId", "1"],
    ],
  },
  {
    name: "openChangeComponentHubItemVersionDialog",
    params: [
      ["projectId", "project1"],
      ["workflowId", "root"],
      ["nodeId", "1"],
    ],
  },
  {
    name: "openChangeComponentLinkTypeDialog",
    params: [
      ["projectId", "project1"],
      ["workflowId", "root"],
      ["nodeId", "1"],
    ],
  },
  {
    name: "openLegacyFlowVariableDialog",
    params: [
      ["projectId", "project1"],
      ["nodeId", "1"],
    ],
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
    ],
  },
  {
    name: "openProject",
    params: [
      ["spaceId", "space1"],
      ["itemId", "123"],
      ["spaceProviderId", "provider1"],
    ],
  },
  {
    name: "closeProject",
    params: [
      ["closingProjectId", "1"],
      ["nextProjectId", "1"],
    ],
    returnValue: true,
  },
  {
    name: "forceCloseProjects",
    params: [["projectIds", ["1", "2", "3"]]],
    flattenParams: true,
  },
  {
    name: "setProjectActiveAndEnsureItsLoaded",
    params: [["projectId", "1"]],
  },
  {
    name: "openLayoutEditor",
    params: [
      ["projectId", "project1"],
      ["workflowId", "workflow1"],
    ],
  },
  {
    name: "getSpaceProviders",
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
  },
  {
    name: "importWorkflows",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
  },
  {
    name: "exportSpaceItem",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
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
    name: "copyBetweenSpaces",
    params: [
      ["sourceProviderId", "provider1"],
      ["sourceSpaceId", "space1"],
      ["sourceItemIds", ["123", "456"]],
      ["destinationProviderId", "provider2"],
      ["destinationSpaceId", "space2"],
      ["destinationItemId", "123"],
      ["excludeData", false],
    ],
  },
  {
    name: "moveOrCopyToSpace",
    params: [
      ["spaceProviderId", "provider1"],
      ["sourceSpaceId", "space1"],
      ["isCopy", false],
      ["sourceItemIds", ["123", "456"]],
      ["destinationSpaceId", "destSpaceId"],
      ["destinationItemId", "destItemId"],
      ["nameCollisionHandling", "CANCEL"],
    ],
  },
  {
    name: "openInBrowser",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
  },
  {
    name: "saveProjectAs",
    params: [
      ["projectId", "project1"],
      ["workflowPreviewSvg", "<svg></svg>"],
    ],
  },
  {
    name: "importComponent",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", ["123"]],
      ["projectId", "project1"],
      ["workflowId", "root"],
      ["x", 10],
      ["y", 10],
    ],
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
    }) => {
      const paramEntries = new Map(params);
      const paramsAsObj = Object.fromEntries(paramEntries);

      const mappingFn = ([_, value]: readonly [string, any]) => value;

      const values = flattenParams
        ? [...params].flatMap(mappingFn)
        : [...params].map(mappingFn);

      const busOnSpy = vi.spyOn($bus, "on");

      const result = API.desktop[desktopApiName || name](paramsAsObj);

      expect(busOnSpy).toHaveBeenCalledWith(
        "desktop-api-function-result-spy",
        expect.anything(),
      );

      expect(window[name]).toHaveBeenCalledWith(...values);

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
    },
  );
});
