import { afterEach, describe, expect, it, vi } from "vitest";
import { deepMocked } from "@/test/utils";
import { API } from "@api";

import { fetchAllSpaceProvidersResponse, loadStore } from "./loadStore";
import { flushPromises } from "@vue/test-utils";
import { SpaceProviderNS } from "@/api/custom-types";

const mockedAPI = deepMocked(API);

describe("spaces::providers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchAllSpaceProviders", () => {
    it("should call the desktop api", async () => {
      const { store } = loadStore();

      await store.dispatch("spaces/fetchAllSpaceProviders");

      expect(store.state.spaces.isLoadingProvider).toBe(true);
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
      expect(store.state.spaces.isLoadingProvider).toBe(true);

      await flushPromises();

      expect(store.state.spaces.isLoadingProvider).toBe(false);
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

      expect(store.state.spaces.spaceProviders.hub1.user).toEqual(mockUser);
    });
  });

  describe("fetchProviderSpaces", () => {
    it("should fetch spaces", async () => {
      const { store } = loadStore();
      const mockSpace = { name: "mock space", description: "" };

      store.state.spaces.spaceProviders = {
        // @ts-ignore
        hub1: {
          id: "hub1",
          name: "Hub 1",
        },
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
          spaces: [
            { id: "local", name: "Local space", private: false, owner: "" },
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
        },
      };

      expect(store.getters["spaces/getSpaceInfo"](projectId)).toEqual({
        id: "privateSpace",
        name: "Private space",
        private: true,
        owner: "",
      });
    });
  });
});
