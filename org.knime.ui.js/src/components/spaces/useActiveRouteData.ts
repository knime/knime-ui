import { computed } from "vue";
import { useRoute } from "vue-router";

import { useStore } from "@/composables/useStore";
import { APP_ROUTES } from "@/router/appRoutes";

export const useActiveRouteData = () => {
  const $route = useRoute();
  const store = useStore();

  const activeSpaceProvider = computed(() => {
    const spaceProviders = store.state.spaces.spaceProviders ?? {};
    return spaceProviders[$route.params.spaceProviderId as string];
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
    const { loadingProviderSpacesData } = store.state.spaces;

    return loadingProviderSpacesData[activeSpaceProvider.value.id];
  });

  return {
    activeSpaceProvider,
    activeSpaceGroup,
    activeSpace,
    isShowingAllSpaces,
    isLoadingSpacesData,
  };
};
