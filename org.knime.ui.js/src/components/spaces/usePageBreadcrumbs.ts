import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { APP_ROUTES } from "@/router/appRoutes";
import { isHubProvider } from "@/store/spaces/util";

import { formatSpaceProviderName } from "./formatSpaceProviderName";
import { useActiveRouteData } from "./useActiveRouteData";
import { useSpaceIcons } from "./useSpaceIcons";

export type BreadcrumbItem = {
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

  const breadcrumbs = computed<Array<BreadcrumbItem>>(() => {
    const isHub = isHubProvider(activeSpaceProvider.value);

    const spaceProviderBreadcrumbItem: BreadcrumbItem = {
      text: formatSpaceProviderName(activeSpaceProvider.value),
      icon: getSpaceProviderIcon(activeSpaceProvider.value),
      clickable: isHub,
      ...(isHub && {
        onClick: () => {
          $router.push({
            name: APP_ROUTES.Home.SpaceSelectionPage,
            params: {
              spaceProviderId: activeSpaceProvider.value.id,
              groupId: "all",
            },
          });
        },
      }),
    };

    if (!isHub || isShowingAllSpaces.value) {
      return [spaceProviderBreadcrumbItem];
    }

    const { spaceId } = $route.params;

    const spaceGroupBreadcrumbItem: BreadcrumbItem = {
      text: activeSpaceGroup.value?.name ?? "",
      // if spaceId is not found, then this will be the last item
      clickable: Boolean(spaceId),

      icon: activeSpaceGroup.value && getSpaceGroupIcon(activeSpaceGroup.value),

      onClick: () => {
        $router.push({
          name: APP_ROUTES.Home.SpaceSelectionPage,
          params: {
            spaceProviderId: activeSpaceProvider.value.id,
            groupId: activeSpaceGroup.value?.id ?? "",
          },
        });
      },
    };

    const spaceBreadcrumbItem: BreadcrumbItem = {
      text: activeSpace.value?.name ?? "",
    };

    const base = [spaceProviderBreadcrumbItem, spaceGroupBreadcrumbItem];

    return spaceId ? base.concat(spaceBreadcrumbItem) : base;
  });

  return { breadcrumbs };
};
