import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { SpaceProviderNS } from "@/api/custom-types";
import type { ComponentNodeTemplateWithExtendedPorts } from "@/lib/data-mappers";
import { createComponentNodeTemplateWithExtendedPorts } from "@/test/factories";
import { createSpaceGroup, createSpaceProvider } from "@/test/factories/spaces";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import { useComponentOwnershipInfo } from "../useComponentOwnershipInfo";

describe("useComponentOwnershipInfo", () => {
  const setup = (
    templateOverrides: Partial<ComponentNodeTemplateWithExtendedPorts>,
  ) => {
    const mockedStores = mockStores();

    mockedStores.spaceProvidersStore.spaceProviders = {
      hub: createSpaceProvider(
        {
          id: "hub",
          type: SpaceProviderNS.TypeEnum.HUB,
          username: "account:user:1",
          spaceGroups: [
            createSpaceGroup({
              name: "Data Team",
              type: SpaceProviderNS.UserTypeEnum.TEAM,
              spaces: [],
            }),
          ],
        },
        true,
      ),
    };

    const nodeTemplate = createComponentNodeTemplateWithExtendedPorts({
      component: true,
      name: "Test Component",
      ...templateOverrides,
    });

    const { getComposableResult } = mountComposable({
      composable: useComponentOwnershipInfo,
      composableProps: { nodeTemplate: ref(nodeTemplate) },
      mockedStores,
    });

    return getComposableResult();
  };

  describe("tooltip", () => {
    it("formats for missing owner", () => {
      const { ownershipInfo } = setup({
        containingSpace: "Public",
        owner: undefined,
      });

      expect(ownershipInfo.value?.tooltip).toBe(
        'From space "Public" owned by an unknown owner.',
      );
      expect(ownershipInfo.value?.isFromCommunity).toBe(false);
    });

    it("formats for current user", () => {
      const { ownershipInfo } = setup({
        containingSpace: "Public",
        owner: { id: "account:user:1", name: "alice", isTeam: false },
      });

      expect(ownershipInfo.value?.tooltip).toBe(
        'From space "Public" owned by you.',
      );
      expect(ownershipInfo.value?.isFromCommunity).toBe(false);
    });

    it("formats for communiy user", () => {
      const { ownershipInfo } = setup({
        containingSpace: "SomeSpace",
        owner: { id: "account:user:2", name: "john", isTeam: false },
      });

      expect(ownershipInfo.value?.tooltip).toBe(
        'From space "SomeSpace" owned by user "john".',
      );
      expect(ownershipInfo.value?.isFromCommunity).toBe(true);
    });

    it("formats for communiy team", () => {
      const { ownershipInfo } = setup({
        containingSpace: "SomeSpace",
        owner: { id: "account:user:3", name: "TheFoos", isTeam: true },
      });

      expect(ownershipInfo.value?.tooltip).toBe(
        'From space "SomeSpace" owned by team "TheFoos".',
      );
      expect(ownershipInfo.value?.isFromCommunity).toBe(true);
    });
  });
});
