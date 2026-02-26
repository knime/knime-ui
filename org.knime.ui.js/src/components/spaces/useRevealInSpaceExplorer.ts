import { watch } from "vue";
import { storeToRefs } from "pinia";
import { type Router, useRouter } from "vue-router";

import EyeIcon from "@knime/styles/img/icons/eye.svg";

import type {
  AncestorInfo,
  SpaceItemReference,
} from "@/api/gateway-api/generated-api";
import { APP_ROUTES } from "@/router/appRoutes";
import { getToastPresets } from "@/services/toastPresets";
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
import { useUIControlsStore } from "@/store/uiControls/uiControls";

const ROOT_ITEM_ID = "root";

export const useRevealInSpaceExplorer = (router?: Router) => {
  const $router = router || useRouter(); // router might not be available in all contexts
  const { isLoadingContent } = storeToRefs(useSpaceOperationsStore());
  const { setCurrentSelectedItemIds } = useSpaceOperationsStore();
  const { activeProjectId } = storeToRefs(useApplicationStore());
  const spaceProvidersStore = useSpaceProvidersStore();
  const { spaceProviders, loadingProviderSpacesData } =
    storeToRefs(spaceProvidersStore);
  const { activeTab } = storeToRefs(usePanelStore());
  const panelStore = usePanelStore();
  const { projectPath } = storeToRefs(useSpaceCachingStore());
  const { setProjectPath } = useSpaceCachingStore();
  const { connectProvider } = useSpaceAuthStore();
  const uiControls = useUIControlsStore();

  const { toastPresets } = getToastPresets();

  const canRevealItem = (providerId: string): boolean => {
    if (!uiControls.canAccessSpaceExplorer) {
      return false;
    }

    const provider = spaceProviders.value?.[providerId];

    if (
      !provider || // Provider is not known
      loadingProviderSpacesData.value[provider.id] // Space groups have not yet been initialized
    ) {
      return false;
    }

    // Only reveal projects that are not Server projects
    return !isServerProvider(provider);
  };

  const handleRevealFailure = (error: unknown = null) => {
    consola.error("Could not reveal in Space Explorer:", error);
    setCurrentSelectedItemIds([]);
    toastPresets.spaces.reveal.revealProjectFailed({ error });
  };

  const getAncestorInfoWithLocalFallback = (
    origin: SpaceItemReference,
  ): Promise<AncestorInfo> => {
    const provider = spaceProviders.value[origin.providerId];

    // If the backend can determine ancestor item IDs cheaply, they are
    // already provided beforehand. Otherwise, we have to fetch ad-hoc.
    if (isLocalProvider(provider) && origin.ancestorItemIds) {
      return origin.ancestorItemIds
        ? Promise.resolve({
            ancestorItemIds: origin.ancestorItemIds,
          })
        : Promise.resolve({ ancestorItemIds: [] });
    }

    return spaceProvidersStore.getAncestorInfo(origin);
  };

  const navigateToSpaceBrowsingPage = async (
    origin: SpaceItemReference,
    selectedItemIds: string[],
  ) => {
    const group = findSpaceGroupFromSpaceId(
      spaceProviders.value ?? {},
      origin.spaceId,
    );

    if (!group) {
      consola.error(
        "navigateToSpaceBrowsingPage: group not found. cannot reveal",
      );
      return null;
    }

    const { itemName, ancestorItemIds } =
      await getAncestorInfoWithLocalFallback(origin);

    await $router.push({
      name: APP_ROUTES.Home.SpaceBrowsingPage,
      params: {
        spaceProviderId: origin.providerId,
        spaceId: origin.spaceId,
        groupId: group.id,
        itemId: ancestorItemIds?.at(0) ?? ROOT_ITEM_ID,
      },
    });

    setCurrentSelectedItemIds(selectedItemIds);
    return itemName ?? null;
  };

  const displayInSidebarSpaceExplorer = async (
    origin: Omit<SpaceItemReference, "ancestorItemIds">,
    selectedItemIds: string[],
  ) => {
    if (!activeProjectId.value) {
      return null;
    }

    if (activeTab.value[activeProjectId.value] !== TABS.SPACE_EXPLORER) {
      panelStore.setCurrentProjectActiveTab(TABS.SPACE_EXPLORER);
    }

    const { providerId, spaceId } = origin;
    const { itemName, ancestorItemIds } =
      await getAncestorInfoWithLocalFallback(origin);

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

    return itemName ?? null;
  };

  const validate = async (params: { providerId: string }) => {
    try {
      if (!canRevealItem(params.providerId)) {
        handleRevealFailure();
        return false;
      }

      const provider = spaceProviders.value?.[params.providerId];
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
          return false;
        }
      }

      return true;
    } catch (error) {
      handleRevealFailure(error);
      return false;
    }
  };

  /**
   * Reveal and select multiple items in the space explorer, regardless of whether user
   * is on home page or workflow page. Items must be siblings in the same folder,
   * otherwise only the first item will be revealed and selected
   */
  const revealMultipleItems = async ({
    providerId,
    spaceId,
    itemIdsToReveal,
  }: {
    providerId: string;
    spaceId: string;
    itemIdsToReveal: string[];
  }) => {
    if (!(await validate({ providerId }))) {
      return;
    }

    try {
      // use first item to determine ancestor of all items, because they are
      // always siblings in the same origin folder
      const [firstItem] = itemIdsToReveal;

      const origin = {
        providerId,
        spaceId,
        itemId: firstItem,
      } satisfies SpaceItemReference;

      const revealAction = activeProjectId.value
        ? displayInSidebarSpaceExplorer
        : navigateToSpaceBrowsingPage;

      await revealAction(origin, itemIdsToReveal);
    } catch (error) {
      handleRevealFailure(error);
    }
  };

  /**
   * Attempts to reveal an item in the space explorer, regardless of whether user
   * is on home page or workflow page.
   * Can optionally receive an item name, which indicates the last known name for the
   * item being revealed. If the name has changed, this action will show a warning
   * toast
   * @param origin Item origin
   * @param itemName Last known name
   */
  const revealSingleItem = async (
    origin: SpaceItemReference,
    itemName = "",
  ) => {
    const checkIfNameHasChangedAndShowWarning = (
      newItemName: string | null,
      oldItemName: string | null,
    ) => {
      if (
        newItemName !== null &&
        oldItemName !== null &&
        oldItemName.length !== 0 &&
        newItemName !== oldItemName
      ) {
        toastPresets.spaces.reveal.nameHasChanged({ newItemName, oldItemName });
      }
    };

    if (!(await validate({ providerId: origin.providerId }))) {
      return;
    }

    try {
      const revealAction = activeProjectId.value
        ? displayInSidebarSpaceExplorer
        : navigateToSpaceBrowsingPage;

      const maybeUpdatedName = await revealAction(origin, [origin.itemId]);

      checkIfNameHasChangedAndShowWarning(maybeUpdatedName, itemName);
    } catch (error) {
      handleRevealFailure(error);
    }
  };

  return {
    revealActionMetadata: {
      label: "Reveal in space explorer",
      icon: EyeIcon,
    },
    revealMultipleItems,
    revealSingleItem,
    canRevealItem,
  };
};
