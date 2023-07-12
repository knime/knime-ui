import { afterEach, describe, expect, it, vi } from "vitest";
import { deepMocked } from "@/test/utils";
import { API } from "@api";

import { fetchAllSpaceProvidersResponse, loadStore } from "./loadStore";
import { flushPromises } from "@vue/test-utils";

const mockedAPI = deepMocked(API);

describe("spaces::loadingProviders", () => {
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
      const mockFetchAllProvidersResponse = {
        ...fetchAllSpaceProvidersResponse,
        hub1: {
          id: "hub1",
          connected: true,
          name: "Hub 1",
          connectionMode: "AUTOMATIC",
        },
      };
      const { store } = loadStore({ mockFetchAllProvidersResponse });

      await store.dispatch("spaces/fetchAllSpaceProviders");
      expect(store.state.spaces.isLoadingProvider).toBe(true);

      await flushPromises();

      expect(store.state.spaces.isLoadingProvider).toBe(false);
      expect(store.state.spaces.spaceProviders).toEqual(
        mockFetchAllProvidersResponse
      );
      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "local",
      });
      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
    });

    it("should keep user data set by connectProvider", async () => {
      const mockFetchAllProvidersResponse = {
        ...fetchAllSpaceProvidersResponse,
        hub1: {
          id: "hub1",
          connected: true,
          name: "Hub 1",
          connectionMode: "AUTOMATIC",
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
          connected: true,
          spaces: [mockSpace],
        })
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
          // @ts-ignore
          spaces: [{ id: "local" }],
        },
      };

      expect(store.getters["spaces/getSpaceInfo"](projectId)).toEqual({
        local: true,
        private: false,
        name: "Local space",
      });
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
          spaces: [
            // @ts-ignore
            { id: "privateSpace", name: "Private space", private: true },
            // @ts-ignore
            { id: "publicSpace", name: "Public space", private: false },
          ],
        },
      };

      expect(store.getters["spaces/getSpaceInfo"](projectId)).toEqual({
        local: false,
        private: true,
        name: "Private space",
      });
    });
  });
});
