import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { API } from "@api";

import { SpaceProviderNS } from "@/api/custom-types";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

describe("spaces::providers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("setAllSpaceProviders", () => {
    it('should set all providers in state and fetch spaces of connected "AUTOMATIC" providers', async () => {
      const spaceProviders: Record<string, SpaceProviderNS.SpaceProvider> = {
        hub1: createSpaceProvider(
          {
            id: "hub1",
            connected: true,
            name: "Hub 1",
            connectionMode: "AUTHENTICATED",
            type: SpaceProviderNS.TypeEnum.HUB,
          },
          false,
        ),
        hub2: createSpaceProvider(
          {
            id: "hub2",
            connected: true,
            name: "Hub 2",
            connectionMode: "AUTHENTICATED",
            type: SpaceProviderNS.TypeEnum.HUB,
          },
          false,
        ),
        hub3: createSpaceProvider(
          {
            id: "hub3",
            connected: false,
            name: "Hub 3",
            connectionMode: "AUTHENTICATED",
            type: SpaceProviderNS.TypeEnum.HUB,
          },
          false,
        ),
      };

      const mockGroup = createSpaceGroup({
        id: "group-1",
        spaces: [createSpace({ id: "space-1" })],
      });

      mockedAPI.space.getSpaceGroups.mockImplementation(() =>
        Promise.resolve([mockGroup]),
      );

      const { spaceProvidersStore } = loadStore();

      const promise = spaceProvidersStore.setAllSpaceProviders(spaceProviders);

      expect(spaceProvidersStore.loadingProviderSpacesData.hub1).toBe(true);
      expect(spaceProvidersStore.loadingProviderSpacesData.hub2).toBe(true);
      expect(
        spaceProvidersStore.loadingProviderSpacesData.hub3,
      ).toBeUndefined();

      await flushPromises();

      await expect(promise).resolves.toEqual({
        successfulProviderIds: ["hub1", "hub2"],
        failedProviderIds: [],
      });

      expect(spaceProvidersStore.spaceProviders!.hub1).toEqual({
        ...spaceProviders.hub1,
        spaceGroups: [mockGroup],
      });
      expect(spaceProvidersStore.spaceProviders!.hub2).toEqual({
        ...spaceProviders.hub2,
        spaceGroups: [mockGroup],
      });
      expect(spaceProvidersStore.spaceProviders!.hub3).toEqual({
        ...spaceProviders.hub3,
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
      const spaceProviders: Record<string, SpaceProviderNS.SpaceProvider> = {
        hub1: createSpaceProvider(
          {
            id: "hub1",
            connected: true,
            name: "Hub 1",
            connectionMode: "AUTHENTICATED",
            type: SpaceProviderNS.TypeEnum.HUB,
          },
          false,
        ),
        hub2: createSpaceProvider(
          {
            id: "hub2",
            connected: true,
            name: "Hub 2",
            connectionMode: "AUTHENTICATED",
            type: SpaceProviderNS.TypeEnum.HUB,
          },
          false,
        ),
        hub3: createSpaceProvider(
          {
            id: "hub3",
            connected: false,
            name: "Hub 3",
            connectionMode: "AUTHENTICATED",
            type: SpaceProviderNS.TypeEnum.HUB,
          },
          false,
        ),
      };

      const mockGroup = createSpaceGroup({
        id: "group-1",
        spaces: [createSpace({ id: "space-1" })],
      });

      mockedAPI.space.getSpaceGroups.mockImplementation(
        // @ts-ignore
        ({ spaceProviderId }) => {
          if (spaceProviderId === "hub2") {
            return Promise.reject(new Error("Failed to load spaces"));
          } else {
            return Promise.resolve([mockGroup]);
          }
        },
      );

      const { spaceProvidersStore } = loadStore();

      const promise = spaceProvidersStore.setAllSpaceProviders(spaceProviders);

      expect(spaceProvidersStore.loadingProviderSpacesData.hub1).toBe(true);
      expect(spaceProvidersStore.loadingProviderSpacesData.hub2).toBe(true);
      expect(
        spaceProvidersStore.loadingProviderSpacesData.hub3,
      ).toBeUndefined();

      await flushPromises();

      await expect(promise).resolves.toEqual({
        successfulProviderIds: ["hub1"],
        failedProviderIds: ["hub2"],
      });

      expect(spaceProvidersStore.spaceProviders!.hub1).toEqual({
        ...spaceProviders.hub1,
        spaceGroups: [mockGroup],
      });
      expect(spaceProvidersStore.spaceProviders!.hub2).toEqual({
        ...spaceProviders.hub2,
        connected: false,
        spaceGroups: [],
      });
      expect(spaceProvidersStore.spaceProviders!.hub3).toEqual({
        ...spaceProviders.hub3,
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

  describe("getSpaceInfo", () => {
    it("should return the information about the local active space", () => {
      const { spaceProvidersStore, spaceCachingStore } = loadStore();
      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };
      spaceProvidersStore.spaceProviders = {
        local: {
          id: "local",
          type: SpaceProviderNS.TypeEnum.LOCAL,
          connected: true,
          connectionMode: "AUTOMATIC",
          name: "",
          spaceGroups: [
            createSpaceGroup({
              spaces: [
                { id: "local", name: "Local space", private: false, owner: "" },
              ],
            }),
          ],
        },
      };

      expect(spaceProvidersStore.getSpaceInfo(projectId)).toEqual(
        expect.objectContaining({
          private: false,
          name: "Local space",
          id: "local",
        }),
      );
    });

    it("should return the information about the private active space", () => {
      const { spaceProvidersStore, spaceCachingStore } = loadStore();
      const projectId = "project2";
      spaceCachingStore.projectPath[projectId] = {
        spaceProviderId: "knime1",
        spaceId: "privateSpace",
        itemId: "level2",
      };
      spaceProvidersStore.spaceProviders = {
        knime1: {
          type: SpaceProviderNS.TypeEnum.HUB,
          connected: true,
          id: "",
          name: "",
          connectionMode: "AUTHENTICATED",
          spaceGroups: [
            createSpaceGroup({
              spaces: [
                {
                  id: "privateSpace",
                  name: "Private space",
                  private: true,
                  owner: "",
                },
                {
                  id: "publicSpace",
                  name: "Public space",
                  private: false,
                  owner: "",
                },
              ],
            }),
          ],
        },
      };

      expect(spaceProvidersStore.getSpaceInfo(projectId)).toEqual(
        expect.objectContaining({
          id: "privateSpace",
          name: "Private space",
          private: true,
          owner: "",
        }),
      );
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
      const data = {
        spaceProviderId: provider.id,
        spaceId: "space1",
        itemId: "item1",
      };

      spaceCachingStore.projectPath[projectId] = data;
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

      const data = {
        spaceProviderId: "someProvider",
        spaceId: "space1",
        itemId: "item1",
      };

      spaceCachingStore.projectPath[projectId] = data;
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
});
