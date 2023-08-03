import { beforeAll, describe, expect, it, vi } from "vitest";

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
  { name: "openAboutDialog" },
  { name: "openUpdateDialog" },
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
    name: "saveWorkflow",
    params: [
      ["projectId", "project1"],
      ["workflowPreviewSvg", "<svg></svg>"],
    ],
  },
  {
    name: "openWorkflow",
    params: [
      ["spaceId", "space1"],
      ["itemId", "123"],
      ["spaceProviderId", "provider1"],
    ],
  },
  {
    name: "closeWorkflow",
    params: [
      ["closingProjectId", "1"],
      ["nextProjectId", "1"],
    ],
    returnValue: true,
  },
  {
    name: "forceCloseWorkflows",
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
    returnValue: JSON.stringify({ name: "user" }),
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
    name: "getNameCollisionStrategy",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemIds", ["123"]],
      ["destinationItemId", "hub1"],
    ],
    returnValue: "NOOP",
  },
  {
    name: "copyBetweenSpaces",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemIds", ["123", "456"]],
    ],
  },
  {
    name: "openInHub",
    params: [
      ["spaceProviderId", "provider1"],
      ["spaceId", "space1"],
      ["itemId", "123"],
    ],
  },
  {
    name: "saveWorkflowAs",
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
    name: "saveAndCloseWorkflows",
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
];

describe("desktop-api", () => {
  beforeAll(() => {
    browserFunctions.forEach(({ name: fn, returnValue }) => {
      window[fn] = returnValue ? vi.fn(() => returnValue) : vi.fn();
    });
  });

  it.each(browserFunctions)(
    "calls %s",
    ({ name, desktopApiName, params = [], flattenParams }) => {
      const paramEntries = new Map(params);
      const paramsAsObj = Object.fromEntries(paramEntries);

      const mappingFn = ([_, value]) => value;

      const values = flattenParams
        ? [...params].flatMap(mappingFn)
        : [...params].map(mappingFn);

      API.desktop[desktopApiName || name](paramsAsObj);

      expect(window[name]).toHaveBeenCalledWith(...values);
    },
  );
});
