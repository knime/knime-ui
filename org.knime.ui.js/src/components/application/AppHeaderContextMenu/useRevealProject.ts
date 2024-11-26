import { type Ref, computed, watch } from "vue";
import { useRouter } from "vue-router";

import { API } from "@/api";
import type { AncestorInfo } from "@/api/custom-types";
import type { SpaceItemReference } from "@/api/gateway-api/generated-api";
import { useStore } from "@/composables/useStore";
import { getToastsProvider } from "@/plugins/toasts";
import { APP_ROUTES } from "@/router/appRoutes";
import { TABS } from "@/store/panel";
import {
  findSpaceGroupFromSpaceId,
  isLocalProvider,
  isServerProvider,
} from "@/store/spaces/util";

import type { AppHeaderContextMenuItem } from "./types";

type UseRevealProject = {
  projectId: Ref<string | null>;
};

const useErrorToast = () => {
  let previousToastId: string;
  const store = useStore();

  const $toast = getToastsProvider();

  const showErrorToast = () => {
    if (previousToastId) {
      $toast.remove(previousToastId);
    }

    store.commit("spaces/setCurrentSelectedItemIds", []);

    previousToastId = $toast.show({
      type: "error",
      headline: "Project not found",
      message: "Could not reveal project in Space Explorer.",
      autoRemove: true,
    });
  };

  return { showErrorToast };
};

export const useRevealProject = (options: UseRevealProject) => {
  const store = useStore();
  const $toast = getToastsProvider();
  const $router = useRouter();

  const openProjects = computed(() => store.state.application.openProjects);

  const activeProjectId = computed(
    () => store.state.application.activeProjectId,
  );

  const isUnknownProject = computed<(projectId: string) => boolean>(
    () => store.getters["application/isUnknownProject"],
  );

  const getAncestorInfo = (
    origin: SpaceItemReference,
    projectId: string,
  ): Promise<AncestorInfo> => {
    const provider = store.state.spaces.spaceProviders?.[origin.providerId];

    if (!provider) {
      return Promise.resolve({ hasNameChanged: false, ancestorItemIds: [] });
    }

    if (isLocalProvider(provider)) {
      return origin.ancestorItemIds
        ? Promise.resolve({
            hasNameChanged: false,
            ancestorItemIds: origin.ancestorItemIds,
          })
        : Promise.resolve({ hasNameChanged: false, ancestorItemIds: [] });
    }

    // Throws error if the ancestor item IDs could not be retrieved
    return API.desktop.getAncestorInfo({
      projectId,
    });
  };

  const navigateToSpaceBrowsingPage = async (
    origin: SpaceItemReference,
    projectId: string,
  ) => {
    const group = findSpaceGroupFromSpaceId(
      store.state.spaces.spaceProviders ?? {},
      origin.spaceId,
    );
    const { hasNameChanged, ancestorItemIds } = await getAncestorInfo(
      origin,
      projectId,
    );

    await $router.push({
      name: APP_ROUTES.Home.SpaceBrowsingPage,
      params: {
        spaceProviderId: origin.providerId,
        spaceId: origin.spaceId,
        groupId: group?.id,
        itemId: ancestorItemIds?.at(0) ?? "root",
      },
    });

    store.commit("spaces/setCurrentSelectedItemIds", [origin.itemId]);
  };

  const displaySpaceExplorerSidebar = async (
    origin: SpaceItemReference,
    projectId: string,
  ) => {
    if (!activeProjectId.value) {
      return;
    }

    if (
      store.state.panel.activeTab[activeProjectId.value] !== TABS.SPACE_EXPLORER
    ) {
      await store.dispatch(
        "panel/setCurrentProjectActiveTab",
        TABS.SPACE_EXPLORER,
      );
    }

    const { providerId, spaceId, itemId } = origin;
    const { hasNameChanged, ancestorItemIds } = await getAncestorInfo(
      origin,
      projectId,
    );

    const currentPath = store.state.spaces.projectPath[activeProjectId.value];
    const nextItemId = ancestorItemIds?.at(0) ?? "root";

    if (
      currentPath?.itemId !== nextItemId ||
      currentPath?.spaceId !== spaceId ||
      currentPath?.spaceProviderId !== providerId
    ) {
      // project belongs to a different path than the current one for this project
      // so we must change the path
      store.commit("spaces/setProjectPath", {
        projectId: activeProjectId.value,
        value: {
          spaceId,
          spaceProviderId: providerId,
          itemId: nextItemId,
        },
      });

      // And make sure it selects the item AFTER the content of the new path has been loaded
      const unWatch = watch(
        () => store.state.spaces.isLoadingContent,
        (isLoading, wasLoading) => {
          if (wasLoading && !isLoading) {
            store.commit("spaces/setCurrentSelectedItemIds", [itemId]);
            unWatch();
          }
        },
      );
    } else {
      store.commit("spaces/setCurrentSelectedItemIds", [itemId]);
    }

    // Notify user in case the project name changed
    if (hasNameChanged) {
      $toast.show({
        type: "warning",
        headline: "Name has changed",
        message: `The project "${options.projectId.value}" name's has changed on the remote Hub`,
        autoRemove: true,
      });
    }
  };

  const { showErrorToast } = useErrorToast();

  const canRevealProject = computed(() => {
    const foundProject = openProjects.value.find(
      ({ projectId }) => projectId === options.projectId.value,
    );

    // cannot reveal unknown projects (aka no origin, or not related to our current providers)
    if (!foundProject || isUnknownProject.value(foundProject.projectId)) {
      return false;
    }

    const provider =
      store.state.spaces.spaceProviders?.[foundProject.origin!.providerId];

    if (!provider) {
      return false; // Cannot check if Server project without provider
    }

    // Only reveal projects that are not Server projects
    return !isServerProvider(provider);
  });

  const menuItem: AppHeaderContextMenuItem = {
    text: "Reveal in space explorer",
    metadata: {
      onClick: async () => {
        try {
          const foundProject = openProjects.value.find(
            ({ projectId }) => projectId === options.projectId.value,
          );

          if (
            !foundProject?.origin ||
            isUnknownProject.value(foundProject.projectId)
          ) {
            consola.error("Reveal project option not supported", {
              foundProject,
            });
            return;
          }

          if (!options.projectId.value) {
            consola.error("No project ID provided, this should not happen");
            return;
          }

          if (!activeProjectId.value) {
            await navigateToSpaceBrowsingPage(
              foundProject.origin,
              options.projectId.value,
            );
            return;
          }

          await displaySpaceExplorerSidebar(
            foundProject.origin,
            options.projectId.value,
          );
        } catch (error) {
          consola.error("Error revealing project in Space Explorer: ", error);
          showErrorToast();
        }
      },
    },
  };

  const revealProjectMenuOption = computed(() => {
    return canRevealProject.value ? [menuItem] : [];
  });

  return { revealProjectMenuOption };
};
