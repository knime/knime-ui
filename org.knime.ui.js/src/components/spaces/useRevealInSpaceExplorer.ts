import { watch } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

import type { AncestorInfo } from "@/api/custom-types";
import type { SpaceItemReference } from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { useApplicationStore } from "@/store/application/application";
import { TABS, usePanelStore } from "@/store/panel";
import { useSpaceAuthStore } from "@/store/spaces/auth";
import { useSpaceCachingStore } from "@/store/spaces/caching";
import { useSpaceProvidersStore } from "@/store/spaces/providers";
import { useSpaceOperationsStore } from "@/store/spaces/spaceOperations";
import {
  findSpaceGroupFromSpaceId,
  isLocalProvider,
  isServerProvider,
} from "@/store/spaces/util";
import { getToastPresets } from "@/toastPresets";

const DEFAULT_GROUP_ID = "defaultGroupId";
const ROOT_ITEM_ID = "root";

export const useRevealInSpaceExplorer = () => {
  const { isLoadingContent } = storeToRefs(useSpaceOperationsStore());
  const { setCurrentSelectedItemIds } = useSpaceOperationsStore();
  const { activeProjectId } = storeToRefs(useApplicationStore());
  const { spaceProviders } = storeToRefs(useSpaceProvidersStore());
  const { activeTab } = storeToRefs(usePanelStore());
  const { setCurrentProjectActiveTab } = usePanelStore();
  const { projectPath } = storeToRefs(useSpaceCachingStore());
  const { setProjectPath } = useSpaceCachingStore();
  const { connectProvider } = useSpaceAuthStore();

  const router = useRouter();
  const { toastPresets } = getToastPresets();

  const canRevealItem = (origin: SpaceItemReference): boolean => {
    const provider = spaceProviders.value?.[origin.providerId];

    if (!provider) {
      return false; // Cannot check if Server project without provider
    }

    // Only reveal projects that are not Server projects
    return !isServerProvider(provider);
  };

  // Fetch ancestor info
  const getAncestorInfo = (
    origin: SpaceItemReference,
  ): Promise<AncestorInfo> => {
    const provider = spaceProviders.value?.[origin.providerId];

    if (!provider) {
      return Promise.resolve({ itemName: null, ancestorItemIds: [] });
    }

    if (isLocalProvider(provider)) {
      return origin.ancestorItemIds
        ? Promise.resolve({
            itemName: null,
            ancestorItemIds: origin.ancestorItemIds,
          })
        : Promise.resolve({ itemName: null, ancestorItemIds: [] });
    }

    // Throws error if the ancestor item IDs could not be retrieved
    return API.desktop.getAncestorInfo({
      providerId: origin.providerId,
      spaceId: origin.spaceId,
      itemId: origin.itemId,
    });
  };

  const resetSelectedItemAndShowError = (error: unknown = null) => {
    setCurrentSelectedItemIds([]);
    toastPresets.spaces.reveal.revealProjectFailed({ error });
  };

  const checkIfNameHasChangedAndShowWarning = (
    newItemName: string | null,
    oldItemName: string | null,
  ) => {
    if (
      newItemName !== null &&
      oldItemName !== null &&
      newItemName !== oldItemName
    ) {
      toastPresets.spaces.reveal.nameHasChanged({ newItemName, oldItemName });
    }
  };

  const navigateToSpaceBrowsingPage = async (
    origin: SpaceItemReference,
    itemName: string | null,
  ) => {
    const group = findSpaceGroupFromSpaceId(
      spaceProviders.value ?? {},
      origin.spaceId,
    );
    const { itemName: updatedItemName, ancestorItemIds } =
      await getAncestorInfo(origin);

    await router.push({
      name: APP_ROUTES.Home.SpaceBrowsingPage,
      params: {
        spaceProviderId: origin.providerId,
        spaceId: origin.spaceId,
        groupId: group?.id ?? DEFAULT_GROUP_ID,
        itemId: ancestorItemIds?.at(0) ?? ROOT_ITEM_ID,
      },
    });

    setCurrentSelectedItemIds([origin.itemId]);

    checkIfNameHasChangedAndShowWarning(updatedItemName, itemName);
  };

  const displayInSidebarSpaceExplorer = async (
    origin: SpaceItemReference,
    itemName: string | null,
  ) => {
    if (!activeProjectId.value) {
      return;
    }

    if (activeTab.value[activeProjectId.value] !== TABS.SPACE_EXPLORER) {
      setCurrentProjectActiveTab(TABS.SPACE_EXPLORER);
    }

    const { providerId, spaceId, itemId } = origin;
    const { itemName: updatedItemName, ancestorItemIds } =
      await getAncestorInfo(origin);

    const currentPath = projectPath.value[activeProjectId.value];
    const nextItemId = ancestorItemIds?.at(0) ?? ROOT_ITEM_ID;

    if (
      currentPath?.itemId !== nextItemId ||
      currentPath?.spaceId !== spaceId ||
      currentPath?.spaceProviderId !== providerId
    ) {
      // project belongs to a different path than the current one for this project
      // so we must change the path
      setProjectPath({
        projectId: activeProjectId.value,
        value: {
          spaceId,
          spaceProviderId: providerId,
          itemId: nextItemId,
        },
      });

      // And make sure it selects the item AFTER the content of the new path has been loaded
      const unWatch = watch(
        () => isLoadingContent.value,
        (isLoading, wasLoading) => {
          if (wasLoading && !isLoading) {
            setCurrentSelectedItemIds([itemId]);
            unWatch();
          }
        },
      );
    } else {
      setCurrentSelectedItemIds([itemId]);
    }

    checkIfNameHasChangedAndShowWarning(updatedItemName, itemName);
  };

  const revealInSpaceExplorer = async (
    origin: SpaceItemReference,
    projectName: string = "",
  ) => {
    try {
      if (!canRevealItem(origin)) {
        resetSelectedItemAndShowError();
        return;
      }

      const provider = spaceProviders.value?.[origin.providerId]!;
      // try connect to provider if we are not connected
      if (!provider.connected) {
        const { isConnected } = await connectProvider({
          spaceProviderId: provider.id,
        });
        if (!isConnected) {
          toastPresets.spaces.auth.connectFailed({
            error: null,
            providerName: provider.name,
          });
          return;
        }
      }

      setCurrentSelectedItemIds([origin.itemId]);

      if (!activeProjectId.value) {
        // No active project, navigate to Space Browsing Page
        await navigateToSpaceBrowsingPage(origin, projectName);
        return;
      }

      // Active project exists, display Space Explorer
      await displayInSidebarSpaceExplorer(origin, projectName);
    } catch (error) {
      consola.error("Could not reveal in Space Explorer:", error);
      resetSelectedItemAndShowError(error);
    }
  };

  return {
    revealInSpaceExplorer,
    canRevealItem,
  };
};
