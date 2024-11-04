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

    return store.state.spaces.allSpaceGroups[groupId as string];
  });

  const activeSpace = computed(() => {
    const { spaceId } = $route.params;

    return store.state.spaces.allSpaces[spaceId as string];
  });

  const isShowingAllSpaces = computed(
    () =>
      $route.name === APP_ROUTES.Home.SpaceSelectionPage &&
      $route.params.groupId === "all",
  );

  return {
    activeSpaceProvider,
    activeSpaceGroup,
    activeSpace,
    isShowingAllSpaces,
  };
};
