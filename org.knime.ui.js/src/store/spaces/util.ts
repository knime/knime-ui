import { h } from "vue";
import { storeToRefs } from "pinia";

import { SpaceProviderNS, type WorkflowOrigin } from "@/api/custom-types";
import type { Project } from "@/api/gateway-api/generated-api";
import MovingItemsTemplate from "@/components/spaces/useMovingItems/MovingItemsTemplate.vue";
import { isBrowser } from "@/environment";
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import { getToastPresets } from "@/toastPresets";
import { useApplicationStore } from "../application/application";

const { KNIME_HUB_HOME_HOSTNAME, KNIME_HUB_DEV_HOSTNAME } = knimeExternalUrls;

export const findSpaceById = (
  spaceProviders: Record<string, SpaceProviderNS.SpaceProvider>,
  spaceId: string,
) => {
  const providers = Object.values(spaceProviders);
  const groups = providers.flatMap((provider) => provider.spaceGroups ?? []);
  const spaces = groups.flatMap((group) => group.spaces ?? []);

  return spaces.find((space) => space.id === spaceId);
};

export const findSpaceGroupFromSpaceId = (
  spaceProviders: Record<string, SpaceProviderNS.SpaceProvider>,
  spaceId: string,
) => {
  const providers = Object.values(spaceProviders);
  const groups = providers.flatMap(({ spaceGroups }) => spaceGroups ?? []);

  return groups.find((group) =>
    (group.spaces ?? []).some((space) => space.id === spaceId),
  );
};

export const isLocalProvider = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
  spaceProvider.type === SpaceProviderNS.TypeEnum.LOCAL;

export const isHubProvider = (spaceProvider: SpaceProviderNS.SpaceProvider) =>
  spaceProvider.type === SpaceProviderNS.TypeEnum.HUB;

export const isServerProvider = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => spaceProvider.type === SpaceProviderNS.TypeEnum.SERVER;

export const isProjectOpen = (
  project: Project,
  referenceOrigin: WorkflowOrigin,
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => {
  return (
    project.origin?.providerId === referenceOrigin.providerId &&
    project.origin?.spaceId === referenceOrigin.spaceId &&
    project.origin?.itemId === referenceOrigin.itemId &&
    isLocalProvider(spaceProvider)
  );
};

/**
 * Checks whether there are any open workflows among the items that are about to be moved and displays a warning toast
 * @param itemIds the items to be moved
 * @param isCopy whether it is a copy or move operation
 * @returns true iff there is an open workflow among the sourceItems that are about to be moved
 */
export const checkOpenWorkflowsBeforeMove = ({
  itemIds,
  isCopy,
}: {
  itemIds: string[];
  isCopy: boolean;
}) => {
  if (isBrowser()) {
    return false;
  }
  const { openProjects } = storeToRefs(useApplicationStore());

  const openedWorkflows = openProjects.value.filter((project) =>
    itemIds.includes(project?.origin?.itemId ?? ""),
  );

  const isInsideFolder = openProjects.value.filter((project) => {
    if (!project.origin) {
      return false;
    }

    const { ancestorItemIds = [] } = project.origin;

    return ancestorItemIds.some((ancestorId) => itemIds.includes(ancestorId));
  });

  if (openedWorkflows.length || isInsideFolder.length) {
    const createModalTemplate = (
      props: InstanceType<typeof MovingItemsTemplate>["$props"],
    ) => h(MovingItemsTemplate, { ...props });

    const { toastPresets } = getToastPresets();

    const openedWorkflowsNames = openedWorkflows.map(
      (workflow) => workflow.name,
    );
    const isInsideFolderNames = isInsideFolder.map((workflow) => workflow.name);

    toastPresets.spaces.crud.moveOrCopyOpenItemsWarning({
      isCopy,
      component: createModalTemplate({
        isCopy,
        openedItemNames: openedWorkflowsNames.concat(isInsideFolderNames),
      }),
    });

    return true;
  }

  return false;
};

export const formatSpaceProviderName = (
  spaceProvider: SpaceProviderNS.SpaceProvider,
) => {
  if (
    isHubProvider(spaceProvider) &&
    spaceProvider.hostname?.includes(KNIME_HUB_DEV_HOSTNAME)
  ) {
    return `${spaceProvider.name} (DEV)`;
  }

  return spaceProvider.name;
};

export const isCommunityHubProvider = (
  provider: SpaceProviderNS.SpaceProvider,
) =>
  provider.connected &&
  (provider.hostname?.includes(KNIME_HUB_HOME_HOSTNAME) ?? false);
