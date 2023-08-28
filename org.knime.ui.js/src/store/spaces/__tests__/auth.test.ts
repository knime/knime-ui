import { afterEach, describe, expect, it, vi } from "vitest";
import { deepMocked } from "@/test/utils";
import { API } from "@api";

import { loadStore } from "./loadStore";
import type { SpaceProviderNS } from "@/api/custom-types";

const mockedAPI = deepMocked(API);

describe("spaces::auth", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("connectProvider", () => {
    it("should fetch user and provider spaces data and update state", async () => {
      const { store } = loadStore();
      const mockUser = { name: "John Doe" };
      const mockSpaces = { spaces: [{ name: "test" }] };

      store.state.spaces.spaceProviders = {
        // @ts-ignore
        hub1: {},
      };
      mockedAPI.space.getSpaceProvider.mockResolvedValue(mockSpaces);
      mockedAPI.desktop.connectSpaceProvider.mockReturnValue(mockUser);
      await store.dispatch("spaces/connectProvider", {
        spaceProviderId: "hub1",
      });

      expect(mockedAPI.desktop.connectSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
      expect(store.state.spaces.spaceProviders.hub1.user).toEqual(mockUser);
      expect(store.state.spaces.spaceProviders.hub1.spaces).toEqual(
        mockSpaces.spaces,
      );
    });

    it("should not fetch provider spaces data if the user is null", async () => {
      const { store } = loadStore();

      store.state.spaces.spaceProviders = {
        // @ts-ignore
        hub1: {},
      };

      mockedAPI.desktop.connectSpaceProvider.mockReturnValue(null);
      await store.dispatch("spaces/connectProvider", {
        spaceProviderId: "hub1",
      });

      expect(mockedAPI.desktop.connectSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
      expect(mockedAPI.space.getSpaceProvider).not.toHaveBeenCalled();
    });
  });

  describe("disconnectProvider", () => {
    it("should disconnect provider and clear spaces and user data", async () => {
      const { store } = loadStore();

      const fullProvider: SpaceProviderNS.SpaceProvider = {
        name: "Hub 1",
        id: "hub1",
        connected: true,
        connectionMode: "AUTHENTICATED",
        user: { name: "John Doe" },
        spaces: [
          { id: "mock", name: "mock space", private: false, owner: "John" },
        ],
      };

      store.state.spaces.projectPath.projectInHub1 = {
        spaceId: "mock space",
        spaceProviderId: "hub1",
        itemId: "someFolderX",
      };

      store.state.spaces.spaceProviders = {
        hub1: fullProvider,
      };

      const expectedProvider = {
        id: fullProvider.id,
        name: fullProvider.name,
        connectionMode: fullProvider.connectionMode,
        connected: false,
      };

      await store.dispatch("spaces/disconnectProvider", {
        spaceProviderId: "hub1",
      });
      expect(store.state.spaces.spaceProviders.hub1).toEqual(expectedProvider);

      // reset projects that were connected to that hub to local
      expect(store.state.spaces.projectPath.projectInHub1).toStrictEqual({
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      });

      // but keep others
      expect(store.state.spaces.projectPath.myProject1.spaceId).toBe(
        "mockSpaceId",
      );
    });
  });
});
