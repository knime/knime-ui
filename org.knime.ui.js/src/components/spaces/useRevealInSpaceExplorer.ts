import { watch } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";
import { type Router, useRouter } from "vue-router";

import type { AncestorInfo } from "@/api/custom-types";
import type { SpaceItemReference } from "@/api/gateway-api/generated-api";
import { isBrowser } from "@/environment";
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

export const useRevealInSpaceExplorer = (router?: Router) => {
  const $router = router || useRouter(); // router might not be available in all contexts
  const { isLoadingContent } = storeToRefs(useSpaceOperationsStore());
  const { setCurrentSelectedItemIds } = useSpaceOperationsStore();
  const { activeProjectId } = storeToRefs(useApplicationStore());
  const { spaceProviders, loadingProviderSpacesData } = storeToRefs(
    useSpaceProvidersStore(),
  );
  const { activeTab } = storeToRefs(usePanelStore());
  const panelStore = usePanelStore();
  const { projectPath } = storeToRefs(useSpaceCachingStore());
  const { setProjectPath } = useSpaceCachingStore();
  const { connectProvider } = useSpaceAuthStore();

  const { toastPresets } = getToastPresets();

  const canRevealItem = (providerId: string): boolean => {
    const provider = spaceProviders.value?.[providerId];

    if (
      isBrowser() || // Ancestor information unavailable in browser
      !provider || // Provider is not known
      loadingProviderSpacesData.value[provider.id] // Space groups have not yet been initialized
    ) {
      return false;
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
    selectedItemIds: string[],
  ) => {
    const group = findSpaceGroupFromSpaceId(
      spaceProviders.value ?? {},
      origin.spaceId,
    );
    const { itemName: updatedItemName, ancestorItemIds } =
      await getAncestorInfo(origin);
    await $router.push({
      name: APP_ROUTES.Home.SpaceBrowsingPage,
      params: {
        spaceProviderId: origin.providerId,
        spaceId: origin.spaceId,
        groupId: group?.id ?? DEFAULT_GROUP_ID,
        itemId: ancestorItemIds?.at(0) ?? ROOT_ITEM_ID,
      },
    });

    setCurrentSelectedItemIds(selectedItemIds);

    checkIfNameHasChangedAndShowWarning(updatedItemName, itemName);
  };

  const displayInSidebarSpaceExplorer = async (
    origin: SpaceItemReference,
    itemName: string | null,
    selectedItemIds: string[],
  ) => {
    if (!activeProjectId.value) {
      return;
    }

    if (activeTab.value[activeProjectId.value] !== TABS.SPACE_EXPLORER) {
      panelStore.setCurrentProjectActiveTab(TABS.SPACE_EXPLORER);
    }

    const { providerId, spaceId } = origin;
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
            setCurrentSelectedItemIds(selectedItemIds);
            unWatch();
          }
        },
      );
    } else {
      setCurrentSelectedItemIds(selectedItemIds);
    }

    checkIfNameHasChangedAndShowWarning(updatedItemName, itemName);
  };

  const revealInSpaceExplorer = async ({
    providerId,
    spaceId,
    itemIds,
    itemName = null,
    ancestorItemIds,
  }: {
    providerId: string;
    spaceId: string;
    itemIds: string[];
    itemName?: string | null;
    ancestorItemIds?: Array<string>;
  }) => {
    try {
      if (!canRevealItem(providerId)) {
        resetSelectedItemAndShowError();
        return;
      }

      const provider = spaceProviders.value?.[providerId];
      // try connect to provider if we are not connected
      if (provider && !provider.connected) {
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

      if (!panelStore.isLeftPanelExpanded) {
        panelStore.toggleLeftPanel();
      }

      panelStore.setCurrentProjectActiveTab(TABS.SPACE_EXPLORER);

      if (!activeProjectId.value) {
        // No active project, navigate to Space Browsing Page
        await navigateToSpaceBrowsingPage(
          { providerId, spaceId, itemId: itemIds[0], ancestorItemIds },
          itemName,
          itemIds,
        );
        return;
      }

      // Active project exists, display Space Explorer
      await displayInSidebarSpaceExplorer(
        { providerId, spaceId, itemId: itemIds[0], ancestorItemIds },
        itemName,
        itemIds,
      );
    } catch (error) {
      consola.error("Could not reveal in Space Explorer:", error);
      resetSelectedItemAndShowError(error);
    }
  };

  const revealItemInSpaceExplorer = async (
    origin: SpaceItemReference,
    itemName = "",
  ) => {
    await revealInSpaceExplorer({
      providerId: origin.providerId,
      spaceId: origin.spaceId,
      itemIds: [origin.itemId],
      itemName,
      ancestorItemIds: origin.ancestorItemIds,
    });
  };

  return {
    revealInSpaceExplorer,
    revealItemInSpaceExplorer,
    canRevealItem,
  };
};
