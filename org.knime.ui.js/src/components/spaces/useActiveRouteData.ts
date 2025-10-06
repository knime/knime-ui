/* eslint-disable no-undefined */
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";

import type { SpaceProviderNS } from "@/api/custom-types";
import { APP_ROUTES } from "@/router/appRoutes";
import { useSpaceProvidersStore } from "@/store/spaces/providers";

export const useActiveRouteData = () => {
  const { spaceProviders, loadingProviderSpacesData } = storeToRefs(
    useSpaceProvidersStore(),
  );
  const $route = useRoute();

  const activeSpaceProvider = computed<
    SpaceProviderNS.SpaceProvider | undefined
  >(() => {
    return spaceProviders.value[$route.params.spaceProviderId as string];
  });

  const activeSpaceGroup = computed<SpaceProviderNS.SpaceGroup | undefined>(
    () => {
      const { groupId } = $route.params;

      if (!activeSpaceProvider.value) {
        return undefined;
      }

      const groups = activeSpaceProvider.value.spaceGroups ?? [];

      return groups.find(({ id }) => id === groupId);
    },
  );

  const activeSpace = computed<SpaceProviderNS.Space | undefined>(() => {
    const { spaceId } = $route.params;

    return activeSpaceGroup.value?.spaces.find(({ id }) => id === spaceId);
  });

  const isShowingAllSpaces = computed(
    () =>
      $route.name === APP_ROUTES.Home.SpaceSelectionPage &&
      $route.params.groupId === "all",
  );

  const isLoadingSpacesData = computed(() => {
    if (!activeSpaceProvider.value) {
      return false;
    }

    return loadingProviderSpacesData.value[activeSpaceProvider.value.id];
  });

  return {
    activeSpaceProvider,
    activeSpaceGroup,
    activeSpace,
    isShowingAllSpaces,
    isLoadingSpacesData,
  };
};
