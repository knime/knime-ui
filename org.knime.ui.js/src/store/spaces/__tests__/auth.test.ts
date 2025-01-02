import { afterEach, describe, expect, it, vi } from "vitest";
import { API } from "@api";

import { SpaceProvider as BaseSpaceProvider } from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import {
  createSpace,
  createSpaceGroup,
  createSpaceProvider,
} from "@/test/factories";
import { deepMocked } from "@/test/utils";

import { loadStore } from "./loadStore";

const mockedAPI = deepMocked(API);

describe("spaces::auth", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("connectProvider", () => {
    it("should fetch user and provider spaces data and update state", async () => {
      const { spaceAuthStore, spaceProvidersStore } = loadStore();
      const mockSpaceProvider = {
        id: "hub1",
        connected: true,
        user: { name: "John Doe" },
      };
      const mockSpaces = createSpaceProvider({
        spaceGroups: [
          createSpaceGroup({ spaces: [createSpace({ name: "test" })] }),
        ],
      });

      spaceProvidersStore.spaceProviders = {
        // @ts-ignore
        hub1: {},
      };
      mockedAPI.space.getSpaceProvider.mockResolvedValue(mockSpaces);
      mockedAPI.desktop.connectSpaceProvider.mockReturnValue(mockSpaceProvider);
      await spaceAuthStore.connectProvider({
        spaceProviderId: "hub1",
      });

      expect(mockedAPI.desktop.connectSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
      expect(mockedAPI.space.getSpaceProvider).toHaveBeenCalledWith({
        spaceProviderId: "hub1",
      });
      expect(spaceProvidersStore.spaceProviders!.hub1.user).toEqual(
        mockSpaceProvider.user,
      );
      expect(spaceProvidersStore.spaceProviders!.hub1.spaceGroups).toEqual(
        mockSpaces.spaceGroups,
      );
    });

    it("should not fetch provider spaces data if the user is null", async () => {
      const { spaceAuthStore, spaceProvidersStore } = loadStore();

      spaceProvidersStore.spaceProviders = {
        // @ts-ignore
        hub1: {},
      };

      mockedAPI.desktop.connectSpaceProvider.mockReturnValue({
        id: "hub1",
        connected: false,
      });
      await spaceAuthStore.connectProvider({
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
      const { spaceAuthStore, spaceCachingStore, spaceProvidersStore } =
        loadStore();

      const fullProvider = createSpaceProvider({
        name: "Hub 1",
        id: "hub1",
        type: BaseSpaceProvider.TypeEnum.HUB,
        connected: true,
        connectionMode: "AUTHENTICATED",
        user: { name: "John Doe" },
        spaceGroups: [
          createSpaceGroup({
            spaces: [
              { id: "mock", name: "mock space", private: false, owner: "John" },
            ],
          }),
        ],
      });

      spaceCachingStore.setProjectPath({
        projectId: "projectInHub1",
        value: {
          spaceId: "mock space",
          spaceProviderId: "hub1",
          itemId: "someFolderX",
        },
      });

      spaceProvidersStore.spaceProviders = {
        hub1: fullProvider,
      };

      const { spaceGroups, ...otherProperties } = fullProvider;
      const expectedProvider = {
        ...otherProperties,
        connected: false,
        spaceGroups: [],
      };

      await spaceAuthStore.disconnectProvider({
        spaceProviderId: "hub1",
        $router: { push: vi.fn(), currentRoute: { value: { name: "" } } },
      });
      expect(spaceProvidersStore.spaceProviders.hub1).toEqual(expectedProvider);

      // reset projects that were connected to that hub to local
      expect(spaceCachingStore.projectPath.projectInHub1).toStrictEqual({
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      });

      // but keep others
      expect(spaceCachingStore.projectPath.myProject1.spaceId).toBe(
        "mockSpaceId",
      );
    });

    it("should navigate to get started page when currently displayed provider gets disconnected", async () => {
      const { spaceAuthStore, spaceCachingStore, spaceProvidersStore } =
        loadStore();

      const fullProvider = createSpaceProvider({
        name: "Hub 1",
        id: "hub1",
        type: BaseSpaceProvider.TypeEnum.HUB,
        connected: true,
        connectionMode: "AUTHENTICATED",
        user: { name: "John Doe" },
        spaceGroups: [
          createSpaceGroup({
            spaces: [
              { id: "mock", name: "mock space", private: false, owner: "John" },
            ],
          }),
        ],
      });

      spaceCachingStore.projectPath.projectInHub1 = {
        spaceId: "mock space",
        spaceProviderId: "hub1",
        itemId: "someFolderX",
      };

      spaceProvidersStore.spaceProviders = {
        hub1: fullProvider,
      };

      const { spaceGroups, ...otherProperties } = fullProvider;
      const expectedProvider = {
        ...otherProperties,
        connected: false,
        spaceGroups: [],
      };

      const routerPush = vi.fn();
      await spaceAuthStore.disconnectProvider({
        spaceProviderId: "hub1",
        $router: {
          push: routerPush,
          currentRoute: {
            // @ts-ignore
            value: {
              name: APP_ROUTES.Home.SpaceBrowsingPage,
              params: { spaceProviderId: "hub1" },
            },
          },
        },
      });
      expect(spaceProvidersStore.spaceProviders.hub1).toEqual(expectedProvider);
      expect(routerPush).toHaveBeenCalledWith({
        name: APP_ROUTES.Home.GetStarted,
      });

      // reset projects that were connected to that hub to local
      expect(spaceCachingStore.projectPath.projectInHub1).toStrictEqual({
        spaceId: "local",
        spaceProviderId: "local",
        itemId: "root",
      });

      // but keep others
      expect(spaceCachingStore.projectPath.myProject1.spaceId).toBe(
        "mockSpaceId",
      );
    });
  });
});
