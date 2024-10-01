import { afterEach, describe, expect, it, vi } from "vitest";
import { deepMocked } from "@/test/utils";
import { API } from "@/api";

import { fetchAllSpaceProvidersResponse, loadStore } from "./loadStore";
import { flushPromises } from "@vue/test-utils";
import { SpaceProviderNS } from "@/api/custom-types";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";

const mockedAPI = deepMocked(API);

describe("spaces::providers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAllSpaceProviders", () => {
    it("should call the desktop api", async () => {
      const { store } = loadStore();

      await store.dispatch("spaces/fetchAllSpaceProviders");

      expect(store.state.spaces.isLoadingProviders).toBe(true);
      expect(mockedAPI.desktop.getSpaceProviders).toHaveBeenCalled();
    });
  });

  describe("setAllSpaceProviders", () => {
    it('should set all providers in state and fetch spaces of connected "AUTOMATIC" providers', async () => {
      const mockFetchAllProvidersResponse: typeof fetchAllSpaceProvidersResponse =
        {
          ...fetchAllSpaceProvidersResponse,
          hub1: {
            id: "hub1",
            connected: true,
            name: "Hub 1",
            connectionMode: "AUTOMATIC",
            type: SpaceProviderNS.TypeEnum.HUB,
          },
        };

      const { store } = loadStore({ mockFetchAllProvidersResponse });

      await store.dispatch("spaces/fetchAllSpaceProviders");
      expect(store.state.spaces.isLoadingProviders).toBe(true);

      await flushPromises();

      expect(store.state.spaces.isLoadingProviders).toBe(false);
      expect(store.state.spaces.spaceProviders).toEqual(
        mockFetchAllProvidersResponse,
      );
      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "local",
      });
      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
    });

    it("should keep user data set by connectProvider", async () => {
      const mockFetchAllProvidersResponse: typeof fetchAllSpaceProvidersResponse =
        {
          ...fetchAllSpaceProvidersResponse,
          hub1: {
            id: "hub1",
            connected: true,
            name: "Hub 1",
            connectionMode: "AUTOMATIC",
            type: SpaceProviderNS.TypeEnum.HUB,
          },
        };
      const { store } = loadStore({ mockFetchAllProvidersResponse });

      const mockUser = { name: "John Doe" };
      store.state.spaces.spaceProviders = {
        // @ts-ignore
        hub1: {
          user: mockUser,
        },
      };

      await store.dispatch("spaces/fetchAllSpaceProviders");

      expect(store.state.spaces.spaceProviders!.hub1.user).toEqual(mockUser);
    });
  });

  describe("fetchProviderSpaces", () => {
    it("should fetch spaces", async () => {
      const { store } = loadStore();
      const mockSpace = { name: "mock space", description: "" };

      store.state.spaces.spaceProviders = {
        hub1: createSpaceProvider({
          id: "hub1",
          name: "Hub 1",
        }),
      };

      mockedAPI.space.getSpaceProvider.mockResolvedValue({
        spaces: [mockSpace],
      });

      const data = await store.dispatch("spaces/fetchProviderSpaces", {
        id: "hub1",
      });

      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });

      expect(data).toEqual(
        expect.objectContaining({
          spaces: [mockSpace],
        }),
      );
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

      expect(store.state.spaces.isLoadingProviderSpaces).toBe(false);

      store.dispatch("spaces/reloadProviderSpaces", { id: provider.id });
      expect(store.state.spaces.isLoadingProviderSpaces).toBe(true);
      await flushPromises();

      expect(store.state.spaces.spaceProviders[provider.id]).toEqual({
        ...provider,
        spaceGroups: newSpaceGroup,
      });
    });
  });
});
