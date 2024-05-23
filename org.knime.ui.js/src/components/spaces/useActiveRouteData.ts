import { computed } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "@/composables/useStore";

export const useActiveRouteData = () => {
  const $route = useRoute();
  const store = useStore();

  const activeSpaceProvider = computed(() => {
    const spaceProviders = store.state.spaces.spaceProviders ?? {};
    return spaceProviders[$route.params.spaceProviderId as string];
  });

  const activeSpaceGroup = computed(() => {
    const { groupId } = $route.params;

    return activeSpaceProvider.value.spaceGroups.find(
      ({ id }) => id === groupId,
    );
  });

  const activeSpace = computed(() => {
    const { spaceId } = $route.params;
    return activeSpaceGroup.value?.spaces.find(({ id }) => id === spaceId);
  });

  return { activeSpaceProvider, activeSpaceGroup, activeSpace };
};
