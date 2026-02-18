import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { SpaceProviderNS } from "@/api/custom-types";
import { createNodeTemplateWithExtendedPorts } from "@/test/factories";
import { createSpaceGroup, createSpaceProvider } from "@/test/factories/spaces";
import { mockStores } from "@/test/utils/mockStores";
import { mountComposable } from "@/test/utils/mountComposable";
import type { ComponentNodeTemplateWithExtendedPorts } from "@/util/dataMappers";
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
          username: "alice",
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

    const baseTemplate = createNodeTemplateWithExtendedPorts({
      component: true,
      name: "Test Component",
    });
    const nodeTemplate = ref({
      ...baseTemplate,
      ...templateOverrides,
    } as ComponentNodeTemplateWithExtendedPorts);

    const { getComposableResult } = mountComposable({
      composable: useComponentOwnershipInfo,
      composableProps: nodeTemplate,
      mockedStores,
    });

    return getComposableResult();
  };

  it("formats ownership tooltip for current user", () => {
    const { componentTooltipText, showCommunityIcon } = setup({
      containingSpace: "Public",
      owner: { id: "account:user:1", name: "alice", isTeam: false },
    });

    expect(componentTooltipText.value).toBe(
      'From space "Public" owned by you.',
    );
    expect(showCommunityIcon.value).toBe(false);
  });

  it("formats ownership tooltip for team", () => {
    const { componentTooltipText, showCommunityIcon } = setup({
      containingSpace: "Public",
      owner: { id: "account:team:1", name: "Data Team", isTeam: true },
    });

    expect(componentTooltipText.value).toBe(
      'From space "Public" owned by your team "Data Team".',
    );
    expect(showCommunityIcon.value).toBe(false);
  });
});
