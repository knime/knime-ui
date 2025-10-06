import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { APP_ROUTES } from "@/router/appRoutes";
import { formatSpaceProviderName, isHubProvider } from "@/store/spaces/util";

import { useActiveRouteData } from "./useActiveRouteData";
import { useSpaceIcons } from "./useSpaceIcons";

export type ClickableBreadcrumbItem = {
  text: string;
  icon?: any;
  clickable?: boolean;
  onClick?: () => void;
};

export const usePageBreadcrumbs = () => {
  const $router = useRouter();
  const $route = useRoute();

  const {
    activeSpaceProvider,
    activeSpaceGroup,
    activeSpace,
    isShowingAllSpaces,
  } = useActiveRouteData();

  const { getSpaceProviderIcon, getSpaceGroupIcon } = useSpaceIcons();

  const breadcrumbs = computed<Array<ClickableBreadcrumbItem>>(() => {
    if (!activeSpaceProvider.value) {
      return [];
    }

    const spaceProviderId = activeSpaceProvider.value.id;
    const isHub = isHubProvider(activeSpaceProvider.value);

    const spaceProviderBreadcrumbItem: ClickableBreadcrumbItem = {
      text: formatSpaceProviderName(activeSpaceProvider.value),
      icon: getSpaceProviderIcon(activeSpaceProvider.value),
      clickable: isHub,
      ...(isHub && {
        onClick: () => {
          $router.push({
            name: APP_ROUTES.Home.SpaceSelectionPage,
            params: { spaceProviderId, groupId: "all" },
          });
        },
      }),
    };

    if (!isHub || isShowingAllSpaces.value) {
      return [spaceProviderBreadcrumbItem];
    }

    const { spaceId } = $route.params;

    const spaceGroupBreadcrumbItem: ClickableBreadcrumbItem = {
      text: activeSpaceGroup.value?.name ?? "",
      // if spaceId is not found, then this will be the last item
      clickable: Boolean(spaceId),

      icon: activeSpaceGroup.value && getSpaceGroupIcon(activeSpaceGroup.value),

      onClick: () => {
        $router.push({
          name: APP_ROUTES.Home.SpaceSelectionPage,
          params: {
            spaceProviderId,
            groupId: activeSpaceGroup.value?.id ?? "",
          },
        });
      },
    };

    const spaceBreadcrumbItem: ClickableBreadcrumbItem = {
      text: activeSpace.value?.name ?? "",
    };

    const base = [spaceProviderBreadcrumbItem, spaceGroupBreadcrumbItem];

    return spaceId ? base.concat(spaceBreadcrumbItem) : base;
  });

  return { breadcrumbs };
};
