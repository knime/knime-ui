import { describe, expect, it, vi } from "vitest";

import { SpaceProviderNS } from "@/api/custom-types";
import type { Project } from "@/api/gateway-api/generated-api";
import { isBrowser, isDesktop } from "@/environment";
import {
  extractHostname,
  knimeExternalUrls,
} from "@/plugins/knimeExternalUrls";
import {
  createProject,
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { mockEnvironment } from "@/test/utils/mockEnvironment.ts";
import { mockStores } from "@/test/utils/mockStores";
import {
  findSpaceById,
  findSpaceGroupFromSpaceId,
  formatSpaceProviderName,
  isCommunityHubProvider,
  isHubProvider,
  isLocalProvider,
  isProjectOpen,
  isServerProvider,
} from "../util";

const { getToastPresetsMock } = vi.hoisted(() => ({
  getToastPresetsMock: vi.fn(() => ({ toastPresets: vi.fn() })),
}));

vi.mock("@/toastPresets", () => ({
  getToastPresets: getToastPresetsMock,
}));

vi.mock("@/environment");

describe("spaces::util", () => {
  const createSpaces = (groupId: string) =>
    new Array(4).fill(0).map((_, index) =>
      createSpace({
        id: `${groupId}:space${index}`,
        name: `Space ${groupId}:${index}`,
      }),
    );

  const createGroupWithSpaces = (id: string) =>
    createSpaceGroup({
      id,
      spaces: createSpaces(id),
    });

  const spaceProvider1 = createSpaceProvider({
    id: "provider1",
    type: SpaceProviderNS.TypeEnum.LOCAL,
    spaceGroups: [
      createGroupWithSpaces("group1"),
      createGroupWithSpaces("group2"),
    ],
  });
  const spaceProvider2 = createSpaceProvider({
    id: "provider2",
    type: SpaceProviderNS.TypeEnum.HUB,
    spaceGroups: [
      createGroupWithSpaces("group3"),
      createGroupWithSpaces("group4"),
    ],
  });
  const spaceProvider3 = createSpaceProvider({
    id: "provider3",
    type: SpaceProviderNS.TypeEnum.SERVER,
    spaceGroups: [
      createGroupWithSpaces("group5"),
      createGroupWithSpaces("group6"),
    ],
  });
  const providers = {
    [spaceProvider1.id]: spaceProvider1,
    [spaceProvider2.id]: spaceProvider2,
    [spaceProvider3.id]: spaceProvider3,
  };

  it("findSpaceById", () => {
    expect(findSpaceById(providers, "group1:space1")).toEqual(
      expect.objectContaining({
        id: "group1:space1",
        name: "Space group1:1",
      }),
    );

    expect(findSpaceById(providers, "group4:space3")).toEqual(
      expect.objectContaining({
        id: "group4:space3",
        name: "Space group4:3",
      }),
    );

    expect(findSpaceById(providers, "groupX:space100")).toBeUndefined();
  });

  it("findSpaceGroupFromSpaceId", () => {
    const actual = findSpaceGroupFromSpaceId(providers, "group1:space1");

    expect(actual).toEqual(
      expect.objectContaining({
        id: "group1",
        name: "Group 1",
      }),
    );

    expect(actual?.spaces.length).toBe(4);

    expect(
      findSpaceGroupFromSpaceId(providers, "groupX:space100"),
    ).toBeUndefined();
  });

  it("isLocalProvider", () => {
    expect(isLocalProvider(spaceProvider1)).toBe(true);
    expect(isLocalProvider(spaceProvider2)).toBe(false);
    expect(isLocalProvider(spaceProvider3)).toBe(false);
  });

  it("isHubProvider", () => {
    expect(isHubProvider(spaceProvider1)).toBe(false);
    expect(isHubProvider(spaceProvider2)).toBe(true);
    expect(isHubProvider(spaceProvider3)).toBe(false);
  });

  it("isServerProvider", () => {
    expect(isServerProvider(spaceProvider1)).toBe(false);
    expect(isServerProvider(spaceProvider2)).toBe(false);
    expect(isServerProvider(spaceProvider3)).toBe(true);
  });

  it("isProjectOpen", () => {
    const openProjects = [
      // from local provider
      createProject({
        projectId: "p1",
        origin: {
          providerId: spaceProvider1.id,
          spaceId: "group1:space1",
          itemId: "open-item-id",
        },
      }),
      // from hub provider
      createProject({
        projectId: "p2",
        origin: {
          providerId: spaceProvider2.id,
          spaceId: "group4:space2",
          itemId: "open-item-id",
        },
      }),
      // from server provider
      createProject({
        projectId: "p3",
        origin: {
          providerId: spaceProvider3.id,
          spaceId: "group6:space3",
          itemId: "open-item-id",
        },
      }),
    ];

    // from local -> should be detected as open
    expect(
      isProjectOpen(
        openProjects.at(0)!,
        {
          providerId: spaceProvider1.id,
          spaceId: "group1:space1",
          itemId: "open-item-id",
        },
        spaceProvider1,
      ),
    ).toBe(true);

    // from local (not opened) -> should NOT be detected as open
    expect(
      isProjectOpen(
        openProjects.at(0)!,
        {
          providerId: spaceProvider1.id,
          spaceId: "groupX:spaceX",
          itemId: "open-item-id",
        },
        spaceProvider1,
      ),
    ).toBe(false);

    // from hub -> should NOT be detected as open
    expect(
      isProjectOpen(
        openProjects.at(0)!,
        {
          providerId: spaceProvider2.id,
          spaceId: "group4:space2",
          itemId: "open-item-id",
        },
        spaceProvider2,
      ),
    ).toBe(false);

    // from server -> should NOT be detected as open
    expect(
      isProjectOpen(
        openProjects.at(0)!,
        {
          providerId: spaceProvider3.id,
          spaceId: "group6:space3",
          itemId: "open-item-id",
        },
        spaceProvider3,
      ),
    ).toBe(false);
  });

  describe("checkOpenWorkflowsBeforeMove", () => {
    const setup = async ({
      openProjects = [],
      itemIds = ["id1", "id2"],
      isCopy = false,
      environment = "DESKTOP",
    }: {
      openProjects?: Project[];
      itemIds?: string[];
      isCopy?: boolean;
      environment?: "BROWSER" | "DESKTOP";
    } = {}) => {
      mockEnvironment(environment, {
        isBrowser,
        isDesktop,
      });

      const checkOpenWorkflowsBeforeMove = (await import("../util.ts"))
        .checkOpenWorkflowsBeforeMove;

      const { applicationStore } = mockStores();
      applicationStore.openProjects = openProjects;

      const warningToastMock = vi.fn();
      const mock = {
        toastPresets: {
          spaces: {
            crud: {
              moveOrCopyOpenItemsWarning: warningToastMock,
            },
          },
        },
      };
      // @ts-expect-error
      getToastPresetsMock.mockReturnValue(mock);

      return {
        warningToastMock,
        run: () => checkOpenWorkflowsBeforeMove({ itemIds, isCopy }),
      };
    };

    it("returns false for no open projects and displays no toast", async () => {
      const { warningToastMock, run } = await setup();
      const result = run();
      expect(result).toBe(false);
      expect(warningToastMock).not.toHaveBeenCalled();
    });

    it("returns false if no open projects referencing one of the moved ids exist", async () => {
      const openProject = {
        projectId: "project1",
        name: "Cold Harbor",
      };
      const { warningToastMock, run } = await setup({
        openProjects: [openProject],
      });
      const result = run();
      expect(result).toBe(false);
      expect(warningToastMock).not.toHaveBeenCalled();
    });

    it("returns true and displays toast if open workflow is moved", async () => {
      const openProject = {
        projectId: "project1",
        name: "Cold Harbor",
        origin: { itemId: "id1", providerId: "Knime-Hub", spaceId: "spaceId1" },
      };
      const { warningToastMock, run } = await setup({
        openProjects: [openProject],
      });
      const result = run();
      expect(result).toBe(true);
      expect(warningToastMock).toHaveBeenCalledWith({
        isCopy: false,
        component: expect.objectContaining({
          props: {
            isCopy: false,
            openedItemNames: ["Cold Harbor"],
          },
        }),
      });
    });

    it("returns true and displays toast if ancestor of open project is moved", async () => {
      const openProject = {
        projectId: "project1",
        name: "Cold Harbor",
        origin: {
          itemId: "other-id",
          providerId: "Knime-Hub",
          spaceId: "spaceId1",
          ancestorItemIds: ["id2"],
        },
      };
      const { warningToastMock, run } = await setup({
        openProjects: [openProject],
      });
      const result = run();
      expect(result).toBe(true);
      expect(warningToastMock).toHaveBeenCalledWith({
        isCopy: false,
        component: expect.objectContaining({
          props: {
            isCopy: false,
            openedItemNames: ["Cold Harbor"],
          },
        }),
      });
    });

    it("returns false if in browser", async () => {
      const openProject = {
        projectId: "project1",
        name: "Cold Harbor",
        origin: {
          itemId: "other-id",
          providerId: "Knime-Hub",
          spaceId: "spaceId1",
          ancestorItemIds: ["id2"],
        },
      };
      const { warningToastMock, run } = await setup({
        openProjects: [openProject],
        environment: "BROWSER",
      });
      const result = run();
      expect(result).toBe(false);
      expect(warningToastMock).not.toHaveBeenCalled();
    });
  });

  it("add a suffix (DEV) for the community hub (dev)", () => {
    const provider = createSpaceProvider({
      id: "community-hub-dev-id",
      name: "KNIME Community Hub",
      type: SpaceProviderNS.TypeEnum.HUB,
      hostname: knimeExternalUrls.KNIME_HUB_DEV_HOSTNAME,
    });

    const formattedName = formatSpaceProviderName(provider);
    expect(formattedName).toBe("KNIME Community Hub (DEV)");
  });

  describe("isCommunityHubProvider", () => {
    it("returns true for connected community hub provider with correct hostname", () => {
      const provider = createSpaceProvider({
        id: "community-hub-id",
        name: "KNIME Community Hub",
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        hostname: `https://${knimeExternalUrls.KNIME_HUB_HOME_HOSTNAME}`,
      });

      expect(isCommunityHubProvider(provider)).toBe(true);
      expect(provider.hostname).toBeDefined();
      expect(extractHostname(provider.hostname as string)).toBe(
        knimeExternalUrls.KNIME_HUB_HOME_HOSTNAME,
      );
    });

    it("returns true for connected community hub provider with hostname without protocol", () => {
      const provider = createSpaceProvider({
        id: "community-hub-id",
        name: "KNIME Community Hub",
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        hostname: knimeExternalUrls.KNIME_HUB_HOME_HOSTNAME,
      });

      expect(isCommunityHubProvider(provider)).toBe(true);
      expect(provider.hostname).toBeDefined();
      expect(extractHostname(provider.hostname as string)).toBe(
        knimeExternalUrls.KNIME_HUB_HOME_HOSTNAME,
      );
    });

    it("returns false for disconnected community hub provider", () => {
      const provider = createSpaceProvider({
        id: "community-hub-id",
        name: "KNIME Community Hub",
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: false,
        hostname: `https://${knimeExternalUrls.KNIME_HUB_HOME_HOSTNAME}`,
      });

      expect(isCommunityHubProvider(provider)).toBe(false);
      expect(provider.hostname).toBeDefined();
      expect(extractHostname(provider.hostname as string)).toBe(
        knimeExternalUrls.KNIME_HUB_HOME_HOSTNAME,
      );
    });

    it("returns false for provider with different hostname", () => {
      const provider = createSpaceProvider({
        id: "other-hub-id",
        name: "Other Hub",
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        hostname: "https://datahub.knime.com",
      });

      expect(isCommunityHubProvider(provider)).toBe(false);
      expect(provider.hostname).toBeDefined();
      expect(extractHostname(provider.hostname as string)).toBe(
        "datahub.knime.com",
      );
      expect(extractHostname(provider.hostname as string)).not.toBe(
        knimeExternalUrls.KNIME_HUB_HOME_HOSTNAME,
      );
    });

    it("returns false for provider with no hostname", () => {
      const provider = createSpaceProvider({
        id: "local-provider-id",
        name: "Local Provider",
        type: SpaceProviderNS.TypeEnum.LOCAL,
        connected: true,
        hostname: undefined,
      });

      expect(isCommunityHubProvider(provider)).toBe(false);
    });

    it("returns false for provider that would match with old includes logic (datahub.knime.com)", () => {
      const provider = createSpaceProvider({
        id: "datahub-id",
        name: "Data Hub",
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        hostname: "https://datahub.knime.com",
      });

      expect(isCommunityHubProvider(provider)).toBe(false);
      expect(provider.hostname).toBeDefined();
      expect(extractHostname(provider.hostname as string)).toBe(
        "datahub.knime.com",
      );
      expect(extractHostname(provider.hostname as string)).not.toBe(
        knimeExternalUrls.KNIME_HUB_HOME_HOSTNAME,
      );
    });
  });
});
