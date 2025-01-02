import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";

import { APP_ROUTES } from "@/router/appRoutes";
import { useSpaceProvidersStore } from "@/store/spaces/providers";

export const useActiveRouteData = () => {
  const { spaceProviders, loadingProviderSpacesData } = storeToRefs(
    useSpaceProvidersStore(),
  );
  const $route = useRoute();

  const activeSpaceProvider = computed(() => {
    return (spaceProviders.value ?? {})[
      $route.params.spaceProviderId as string
    ];
  });

  const activeSpaceGroup = computed(() => {
    const { groupId } = $route.params;
    const groups = activeSpaceProvider.value.spaceGroups ?? [];

    return groups.find(({ id }) => id === groupId);
  });

  const activeSpace = computed(() => {
    const { spaceId } = $route.params;

    return activeSpaceGroup.value?.spaces.find(({ id }) => id === spaceId);
  });

  const isShowingAllSpaces = computed(
    () =>
      $route.name === APP_ROUTES.Home.SpaceSelectionPage &&
      $route.params.groupId === "all",
  );

  const isLoadingSpacesData = computed(() => {
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
