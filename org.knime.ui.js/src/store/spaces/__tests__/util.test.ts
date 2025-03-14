import { describe, expect, it } from "vitest";

import { SpaceProviderNS } from "@/api/custom-types";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import {
  createProject,
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import {
  findSpaceById,
  findSpaceGroupFromSpaceId,
  formatSpaceProviderName,
  isHubProvider,
  isLocalProvider,
  isProjectOpen,
  isServerProvider,
} from "../util";

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
});
