import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import { SpaceProviderNS } from "@/api/custom-types";
import { SpaceProvider } from "@/api/gateway-api/generated-api";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

const { KNIME_HUB_HOME_HOSTNAME, KNIME_HUB_DEV_HOSTNAME } = knimeExternalUrls;

describe("spaces::providers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("providers data lifecyle", () => {
    const spaceProviders: SpaceProvider[] = [
      {
        id: "hub1",
        connected: true,
        name: "Hub 1",
        connectionMode: SpaceProvider.ConnectionModeEnum.AUTHENTICATED,
        type: SpaceProvider.TypeEnum.HUB,
      },
      {
        id: "hub2",
        connected: true,
        name: "Hub 2",
        connectionMode: SpaceProvider.ConnectionModeEnum.AUTHENTICATED,
        type: SpaceProvider.TypeEnum.HUB,
      },
      {
        id: "hub3",
        connected: false,
        name: "Hub 3",
        connectionMode: SpaceProvider.ConnectionModeEnum.AUTHENTICATED,
        type: SpaceProvider.TypeEnum.HUB,
      },
    ];

    const mockGroup = createSpaceGroup({
      id: "group-1",
      spaces: [createSpace({ id: "space-1" })],
    });

    it('should set all providers in state and fetch spaces of connected "AUTOMATIC" providers', async () => {
      const { spaceProvidersStore } = loadStore();

      mockedAPI.space.getSpaceGroups.mockImplementation(() =>
        Promise.resolve([mockGroup]),
      );

      spaceProvidersStore.setAllSpaceProviders(spaceProviders);
      const promise =
        spaceProvidersStore.fetchSpaceGroupsForProviders(spaceProviders);

      expect(spaceProvidersStore.loadingProviderSpacesData.hub1).toBe(true);
      expect(spaceProvidersStore.loadingProviderSpacesData.hub2).toBe(true);
      expect(
        spaceProvidersStore.loadingProviderSpacesData.hub3,
      ).toBeUndefined();

      await expect(promise).resolves.toEqual({
        failedProviders: [],
      });

      expect(spaceProvidersStore.spaceProviders!.hub1).toEqual({
        ...spaceProviders[0],
        spaceGroups: [mockGroup],
      });
      expect(spaceProvidersStore.spaceProviders!.hub2).toEqual({
        ...spaceProviders[1],
        spaceGroups: [mockGroup],
      });
      expect(spaceProvidersStore.spaceProviders!.hub3).toEqual({
        ...spaceProviders[2],
        spaceGroups: [],
      });
      expect(mockedAPI.space.getSpaceGroups).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
      expect(mockedAPI.space.getSpaceGroups).toHaveBeenCalledWith({
        spaceProviderId: "hub2",
      });
      expect(mockedAPI.space.getSpaceGroups).not.toHaveBeenCalledWith({
        spaceProviderId: "hub3",
      });
    });

    it("should handle errors when loading provider data", async () => {
      mockedAPI.space.getSpaceGroups.mockImplementation(
        // @ts-expect-error
        ({ spaceProviderId }) => {
          if (spaceProviderId === "hub2") {
            return Promise.reject(new Error("Failed to load spaces"));
          } else {
            return Promise.resolve([mockGroup]);
          }
        },
      );
      const { spaceProvidersStore } = loadStore();

      spaceProvidersStore.setAllSpaceProviders(spaceProviders);
      const promise =
        spaceProvidersStore.fetchSpaceGroupsForProviders(spaceProviders);

      expect(spaceProvidersStore.loadingProviderSpacesData.hub1).toBe(true);
      expect(spaceProvidersStore.loadingProviderSpacesData.hub2).toBe(true);
      expect(
        spaceProvidersStore.loadingProviderSpacesData.hub3,
      ).toBeUndefined();

      await expect(promise).resolves.toEqual({
        failedProviders: [
          { name: "Hub 2", error: new Error("Failed to load spaces") },
        ],
      });

      expect(spaceProvidersStore.spaceProviders!.hub1).toEqual({
        ...spaceProviders[0],
        spaceGroups: [mockGroup],
      });
      expect(spaceProvidersStore.spaceProviders!.hub2).toEqual({
        ...spaceProviders[1],
        connected: false,
        spaceGroups: [],
      });
      expect(spaceProvidersStore.spaceProviders!.hub3).toEqual({
        ...spaceProviders[2],
        spaceGroups: [],
      });
      expect(mockedAPI.space.getSpaceGroups).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
      expect(mockedAPI.space.getSpaceGroups).toHaveBeenCalledWith({
        spaceProviderId: "hub2",
      });
      expect(mockedAPI.space.getSpaceGroups).not.toHaveBeenCalledWith({
        spaceProviderId: "hub3",
      });
    });

    it("should sync the open project path after loading space groups for providers", async () => {
      const { spaceCachingStore, spaceProvidersStore, applicationStore } =
        loadStore();
      mockedAPI.space.getSpaceGroups.mockImplementation(() =>
        Promise.resolve([mockGroup]),
      );

      spaceProvidersStore.setAllSpaceProviders(spaceProviders);
      await spaceProvidersStore.fetchSpaceGroupsForProviders(spaceProviders);

      const { openProjects } = applicationStore;
      expect(spaceCachingStore.syncPathWithOpenProjects).toHaveBeenCalledWith({
        openProjects,
      });
    });
  });

  describe("fetchProviderSpaces", () => {
    it("should fetch spaces", async () => {
      const { spaceProvidersStore } = loadStore();
      const mockSpace = createSpace({ name: "mock space", description: "" });

      spaceProvidersStore.spaceProviders = {
        hub1: createSpaceProvider({
          id: "hub1",
          name: "Hub 1",
        }),
      };

      const mockResponse = [
        createSpaceGroup({
          spaces: [mockSpace],
        }),
      ];

      mockedAPI.space.getSpaceGroups.mockResolvedValue(mockResponse);

      expect(spaceProvidersStore.loadingProviderSpacesData.hub1).toBeFalsy();

      const promise = spaceProvidersStore.fetchProviderSpaces({
        id: "hub1",
      });

      expect(spaceProvidersStore.loadingProviderSpacesData.hub1).toBe(true);

      await flushPromises();
      expect(spaceProvidersStore.loadingProviderSpacesData.hub1).toBe(false);

      expect(mockedAPI.space.getSpaceGroups).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });

      await expect(promise).resolves.toEqual(mockResponse);
    });
  });

  describe("getProviderInfoFromProjectPath", () => {
    it("should return the information about provider based on the projectPath", () => {
      const { spaceProvidersStore, spaceCachingStore } = loadStore();

      const provider = createSpaceProvider({
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        id: "knime1",
        name: "blah",
        connectionMode: "AUTHENTICATED",
        spaceGroups: [],
      });

      spaceProvidersStore.spaceProviders = {
        [provider.id]: provider,
      };

      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: provider.id,
        spaceId: "space1",
        itemId: "item1",
      };
      expect(
        spaceProvidersStore.getProviderInfoFromProjectPath(projectId),
      ).toEqual(provider);
    });

    it("should return null if the projectPath is empty", () => {
      const { spaceProvidersStore, spaceCachingStore } = loadStore();
      spaceCachingStore.projectPath = {};
      expect(
        spaceProvidersStore.getProviderInfoFromProjectPath("anything"),
      ).toBeNull();
    });

    it("should return null if the provider is not found in spaceProviders", () => {
      const { spaceProvidersStore, spaceCachingStore } = loadStore();

      const provider = createSpaceProvider({
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        id: "knime1",
        name: "blah",
        connectionMode: "AUTHENTICATED",
        spaceGroups: [],
      });

      spaceProvidersStore.spaceProviders = {
        [provider.id]: provider,
      };

      const projectId = "project2";

      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "someProvider",
        spaceId: "space1",
        itemId: "item1",
      };
      expect(
        spaceProvidersStore.getProviderInfoFromProjectPath(projectId),
      ).toBeNull();
    });
  });

  describe("activeProjectProvider", () => {
    it("should return the correct value", () => {
      const provider = createSpaceProvider({
        id: "provider1",
      });

      const { spaceProvidersStore } = loadStore({
        activeProjectOrigin: {
          providerId: provider.id,
          spaceId: "some-space",
          itemId: "some-item",
        },
        isUnknownProject: false,
      });

      spaceProvidersStore.spaceProviders = {
        [provider.id]: provider,
      };

      expect(spaceProvidersStore.activeProjectProvider).toEqual(provider);
    });

    it("should return null if the active project's provider is from unknown origin", () => {
      const provider = createSpaceProvider({
        id: "provider1",
      });

      const { spaceProvidersStore } = loadStore({
        activeProjectOrigin: {
          providerId: provider.id,
          spaceId: "some-space",
          itemId: "some-item",
        },
      });

      expect(spaceProvidersStore.activeProjectProvider).toBeNull();
    });
  });

  describe("reloadProviderSpaces", () => {
    it("should reload a space provider's spaces", async () => {
      const provider = createSpaceProvider();

      const newSpaceGroups = [
        createSpaceGroup({
          spaces: [createSpace({ id: "new1" }), createSpace({ id: "new1" })],
        }),
      ];

      mockedAPI.space.getSpaceGroups.mockResolvedValue(newSpaceGroups);

      const { spaceProvidersStore } = loadStore();

      spaceProvidersStore.spaceProviders = {
        [provider.id]: provider,
      };

      expect(spaceProvidersStore.spaceProviders[provider.id]).toEqual(provider);

      expect(
        spaceProvidersStore.loadingProviderSpacesData[provider.id],
      ).toBeFalsy();

      spaceProvidersStore.reloadProviderSpaces({ id: provider.id });
      expect(spaceProvidersStore.loadingProviderSpacesData[provider.id]).toBe(
        true,
      );
      await flushPromises();

      expect(
        spaceProvidersStore.loadingProviderSpacesData[provider.id],
      ).toBeFalsy();

      expect(spaceProvidersStore.spaceProviders[provider.id]).toEqual({
        ...provider,
        spaceGroups: newSpaceGroups,
      });
    });
  });

  describe("getCommunityHubInfo", () => {
    it("should return the correct value", () => {
      const { spaceProvidersStore } = loadStore();

      const provider = createSpaceProvider({
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        id: "project1",
        name: "community-hub",
        hostname: `https://${KNIME_HUB_HOME_HOSTNAME}`,
        spaceGroups: [
          {
            id: "space-group1",
            name: "user-name",
            type: SpaceProviderNS.UserTypeEnum.USER,
            spaces: [],
          },
        ],
      });

      spaceProvidersStore.spaceProviders = {
        [provider.id]: provider,
      };

      expect(spaceProvidersStore.getCommunityHubInfo).toEqual({
        isOnlyCommunityHubMounted: true,
        isCommunityHubConnected: true,
        communityHubProvider: provider,
        areAllGroupsUsers: true,
      });
    });

    it("should return the correct value for multiple providers", () => {
      const { spaceProvidersStore } = loadStore();

      const provider = createSpaceProvider({
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        id: "project1",
        name: "community-hub",
        hostname: `https://${KNIME_HUB_HOME_HOSTNAME}`,
        spaceGroups: [
          {
            id: "space-group1",
            name: "user-name",
            type: SpaceProviderNS.UserTypeEnum.USER,
            spaces: [],
          },
          {
            id: "space-group2",
            name: "user-name",
            type: SpaceProviderNS.UserTypeEnum.TEAM,
            spaces: [],
          },
        ],
      });

      const provider2 = createSpaceProvider({
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        id: "project2",
        name: "community-hub-dev",
        hostname: KNIME_HUB_DEV_HOSTNAME,
        spaceGroups: [],
      });

      const provider3 = createSpaceProvider({
        type: SpaceProviderNS.TypeEnum.SERVER,
        connected: true,
        id: "project3",
        name: "server",
        spaceGroups: [],
      });

      spaceProvidersStore.spaceProviders = {
        [provider.id]: provider,
        [provider2.id]: provider2,
        [provider3.id]: provider3,
      };

      expect(spaceProvidersStore.getCommunityHubInfo).toEqual({
        isOnlyCommunityHubMounted: false,
        isCommunityHubConnected: true,
        communityHubProvider: provider,
        areAllGroupsUsers: false,
      });
    });
  });

  describe("getRecycleBinUrl", () => {
    it("should return the recycle bin url", () => {
      const { spaceProvidersStore } = loadStore();
      const provider = createSpaceProvider({
        id: "provider1",
        hostname: "https://api.knime.com/hub",
      });
      spaceProvidersStore.spaceProviders = {
        [provider.id]: provider,
      };

      const url = spaceProvidersStore.getTrashUrl(provider.id, "my-group");
      expect(url).toBe("https://knime.com/hub/my-group/trash");
    });

    it("should return null if hostname does not start with api.", () => {
      const { spaceProvidersStore } = loadStore();
      const provider = createSpaceProvider({
        id: "provider1",
        hostname: "https://knime.com/hub",
      });
      spaceProvidersStore.spaceProviders = {
        [provider.id]: provider,
      };

      const url = spaceProvidersStore.getTrashUrl(provider.id, "my-group");
      expect(url).toBeNull();
    });

    it("should return null if provider has no hostname", () => {
      const { spaceProvidersStore } = loadStore();
      const provider = createSpaceProvider({
        id: "provider1",
        hostname: undefined,
      });
      spaceProvidersStore.spaceProviders = {
        [provider.id]: provider,
      };

      const url = spaceProvidersStore.getTrashUrl(provider.id, "my-group");
      expect(url).toBeNull();
    });

    it("should return null for invalid provider id", () => {
      const { spaceProvidersStore } = loadStore();
      const url = spaceProvidersStore.getTrashUrl(
        "invalid-provider",
        "my-group",
      );
      expect(url).toBeNull();
    });

    it("should return null for invalid hostname url", () => {
      const { spaceProvidersStore } = loadStore();
      const provider = createSpaceProvider({
        id: "provider1",
        hostname: "invalid-url",
      });
      spaceProvidersStore.spaceProviders = {
        [provider.id]: provider,
      };
      const url = spaceProvidersStore.getTrashUrl(provider.id, "my-group");
      expect(url).toBeNull();
    });
  });
});
