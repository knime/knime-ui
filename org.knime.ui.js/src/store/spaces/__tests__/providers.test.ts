import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";

import { API } from "@/api";
import { SpaceProviderNS } from "@/api/custom-types";
import { StoreActionException } from "@/api/gateway-api/exceptions";
import {
  NetworkException,
  ServiceCallException,
} from "@/api/gateway-api/generated-api";
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

  describe("fetchAllSpaceProviders", () => {
    it("should call the desktop api", async () => {
      const { store } = loadStore();

      mockedAPI.desktop.getSpaceProviders.mockResolvedValue(undefined);
      await store.dispatch("spaces/fetchAllSpaceProviders");

      expect(store.state.spaces.isLoadingProviders).toBe(true);
      expect(mockedAPI.desktop.getSpaceProviders).toHaveBeenCalled();
    });
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

      mockedAPI.space.getSpaceProvider.mockImplementation(() =>
        Promise.resolve({ spaceGroups: [mockGroup] }),
      );

      const { store } = loadStore({
        mockFetchAllProvidersResponse: spaceProviders,
      });

      const promise = store.dispatch(
        "spaces/setAllSpaceProviders",
        spaceProviders,
      );

      expect(store.state.spaces.loadingProviderSpacesData.hub1).toBe(true);
      expect(store.state.spaces.loadingProviderSpacesData.hub2).toBe(true);
      expect(store.state.spaces.loadingProviderSpacesData.hub3).toBeUndefined();

      await flushPromises();

      await expect(promise).resolves.toEqual({
        successfulProviderIds: ["hub1", "hub2"],
        failedProviderIds: [],
      });

      expect(store.state.spaces.spaceProviders!.hub1).toEqual({
        ...spaceProviders.hub1,
        spaceGroups: [mockGroup],
      });
      expect(store.state.spaces.spaceProviders!.hub2).toEqual({
        ...spaceProviders.hub2,
        spaceGroups: [mockGroup],
      });
      expect(store.state.spaces.spaceProviders!.hub3).toEqual({
        ...spaceProviders.hub3,
        spaceGroups: [],
      });
      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub2",
      });
      expect(mockedAPI.space.getSpaceProvider).not.toHaveBeenCalledWith({
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

      mockedAPI.space.getSpaceProvider.mockImplementation(
        // @ts-ignore
        ({ spaceProviderId }) => {
          if (spaceProviderId === "hub2") {
            return Promise.reject(new Error("Failed to load spaces"));
          } else {
            return Promise.resolve({ spaceGroups: [mockGroup] });
          }
        },
      );

      const { store } = loadStore({
        mockFetchAllProvidersResponse: spaceProviders,
      });

      const promise = store.dispatch(
        "spaces/setAllSpaceProviders",
        spaceProviders,
      );

      expect(store.state.spaces.loadingProviderSpacesData.hub1).toBe(true);
      expect(store.state.spaces.loadingProviderSpacesData.hub2).toBe(true);
      expect(store.state.spaces.loadingProviderSpacesData.hub3).toBeUndefined();

      await flushPromises();

      await expect(promise).resolves.toEqual({
        successfulProviderIds: ["hub1"],
        failedProviderIds: ["hub2"],
      });

      expect(store.state.spaces.spaceProviders!.hub1).toEqual({
        ...spaceProviders.hub1,
        spaceGroups: [mockGroup],
      });
      expect(store.state.spaces.spaceProviders!.hub2).toEqual({
        ...spaceProviders.hub2,
        connected: false,
        spaceGroups: [],
      });
      expect(store.state.spaces.spaceProviders!.hub3).toEqual({
        ...spaceProviders.hub3,
        spaceGroups: [],
      });
      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub2",
      });
      expect(mockedAPI.space.getSpaceProvider).not.toHaveBeenCalledWith({
        spaceProviderId: "hub3",
      });
    });
  });

  describe("fetchProviderSpaces", () => {
    it("should fetch spaces", async () => {
      const { store } = loadStore();
      const mockSpace = createSpace({ name: "mock space", description: "" });

      store.state.spaces.spaceProviders = {
        hub1: createSpaceProvider({
          id: "hub1",
          name: "Hub 1",
        }),
      };

      const mockResponse = {
        spaceGroups: [
          createSpaceGroup({
            spaces: [mockSpace],
          }),
        ],
      };

      mockedAPI.space.getSpaceProvider.mockResolvedValue(mockResponse);

      expect(store.state.spaces.loadingProviderSpacesData.hub1).toBeFalsy();

      const promise = store.dispatch("spaces/fetchProviderSpaces", {
        id: "hub1",
      });

      expect(store.state.spaces.loadingProviderSpacesData.hub1).toBe(true);

      await flushPromises();
      expect(store.state.spaces.loadingProviderSpacesData.hub1).toBe(false);

      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });

      expect(promise).resolves.toEqual(mockResponse);
    });

    it("should handle `ServiceCallException`s", async () => {
      const { store } = loadStore();

      store.state.spaces.spaceProviders = {
        hub1: createSpaceProvider({
          id: "hub1",
          name: "Hub 1",
        }),
      };

      const error = new ServiceCallException({
        message: "Something wrong in the API",
      });

      const expected = new StoreActionException(
        "Error fetching provider spaces",
        error,
      );

      mockedAPI.space.getSpaceProvider.mockRejectedValue(error);

      expect(() =>
        store.dispatch("spaces/fetchProviderSpaces", {
          id: "hub1",
        }),
      ).rejects.toThrowError(expected);

      await flushPromises();

      expect(store.state.spaces.loadingProviderSpacesData.hub1).toBe(false);
    });

    it("should handle `NetworkException`s", () => {
      const { store } = loadStore();

      store.state.spaces.spaceProviders = {
        hub1: createSpaceProvider({
          id: "hub1",
          name: "Hub 1",
        }),
      };

      const error = new NetworkException({
        message: "Connection loss",
      });

      const expected = new StoreActionException("Connectivity problem", error);

      mockedAPI.space.getSpaceProvider.mockRejectedValue(error);

      expect(() =>
        store.dispatch("spaces/fetchProviderSpaces", {
          id: "hub1",
        }),
      ).rejects.toThrowError(expected);
    });
  });

  describe("getSpaceInfo", () => {
    it("should return the information about the local active space", () => {
      const { store } = loadStore();
      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "local",
        spaceId: "local",
        itemId: "level2",
      };
      store.state.spaces.spaceProviders = {
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

      expect(store.getters["spaces/getSpaceInfo"](projectId)).toEqual(
        expect.objectContaining({
          private: false,
          name: "Local space",
          id: "local",
        }),
      );
    });

    it("should return the information about the private active space", () => {
      const { store } = loadStore();
      const projectId = "project2";
      store.state.spaces.projectPath[projectId] = {
        spaceProviderId: "knime1",
        spaceId: "privateSpace",
        itemId: "level2",
      };
      store.state.spaces.spaceProviders = {
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

      expect(store.getters["spaces/getSpaceInfo"](projectId)).toEqual(
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
      const { store } = loadStore();

      const provider = createSpaceProvider({
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        id: "knime1",
        name: "blah",
        connectionMode: "AUTHENTICATED",
        spaceGroups: [],
      });

      store.state.spaces.spaceProviders = {
        [provider.id]: provider,
      };

      const projectId = "project2";
      const data = {
        spaceProviderId: provider.id,
        spaceId: "space1",
        itemId: "item1",
      };

      store.state.spaces.projectPath[projectId] = data;
      expect(
        store.getters["spaces/getProviderInfoFromProjectPath"](projectId),
      ).toEqual(provider);
    });

    it("should return empty object if the projectPath is empty", () => {
      const { store } = loadStore();
      store.state.spaces.projectPath = {};
      expect(
        store.getters["spaces/getProviderInfoFromProjectPath"]("anything"),
      ).toEqual({});
    });

    it("should return empty object if the provider is not found in spaceProviders", () => {
      const { store } = loadStore();

      const provider = createSpaceProvider({
        type: SpaceProviderNS.TypeEnum.HUB,
        connected: true,
        id: "knime1",
        name: "blah",
        connectionMode: "AUTHENTICATED",
        spaceGroups: [],
      });

      store.state.spaces.spaceProviders = {
        [provider.id]: provider,
      };

      const projectId = "project2";

      const data = {
        spaceProviderId: "someProvider",
        spaceId: "space1",
        itemId: "item1",
      };

      store.state.spaces.projectPath[projectId] = data;
      expect(
        store.getters["spaces/getProviderInfoFromProjectPath"](projectId),
      ).toEqual({});
    });
  });

  describe("activeProjectProvider", () => {
    it("should return the correct value", () => {
      const provider = createSpaceProvider({
        id: "provider1",
      });

      const { store } = loadStore({
        activeProjectOrigin: {
          providerId: provider.id,
          spaceId: "some-space",
          itemId: "some-item",
        },
      });

      store.state.spaces.spaceProviders = {
        [provider.id]: provider,
      };

      expect(store.getters["spaces/activeProjectProvider"]).toEqual(provider);
    });

    it("should return null if the active project's provider is from unknown origin", () => {
      const provider = createSpaceProvider({
        id: "provider1",
      });

      const { store } = loadStore({
        activeProjectOrigin: {
          providerId: provider.id,
          spaceId: "some-space",
          itemId: "some-item",
        },
      });

      expect(store.getters["spaces/activeProjectProvider"]).toBeNull();
    });
  });

  describe("reloadProviderSpaces", () => {
    it("should reload a space provider's spaces", async () => {
      const provider = createSpaceProvider();

      const newSpaceGroup = createSpaceGroup({
        spaces: [createSpace({ id: "new1" }), createSpace({ id: "new1" })],
      });

      mockedAPI.space.getSpaceProvider.mockResolvedValue({
        ...provider,
        spaceGroups: newSpaceGroup,
      });

      const { store } = loadStore();

      store.state.spaces.spaceProviders = {
        [provider.id]: provider,
      };

      expect(store.state.spaces.spaceProviders[provider.id]).toEqual(provider);

      expect(
        store.state.spaces.loadingProviderSpacesData[provider.id],
      ).toBeFalsy();

      store.dispatch("spaces/reloadProviderSpaces", { id: provider.id });
      expect(store.state.spaces.loadingProviderSpacesData[provider.id]).toBe(
        true,
      );
      await flushPromises();

      expect(
        store.state.spaces.loadingProviderSpacesData[provider.id],
      ).toBeFalsy();

      expect(store.state.spaces.spaceProviders[provider.id]).toEqual({
        ...provider,
        spaceGroups: newSpaceGroup,
      });
    });
  });
});
