import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import { APP_ROUTES } from "@/router/appRoutes";
import { SpaceProviderNS } from "@/api/custom-types";

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

  const isHubProvider = computed<boolean>(
    () => activeSpaceProvider.value.type === SpaceProviderNS.TypeEnum.HUB,
  );

  const breadcrumbs = computed<Array<BreadcrumbItem>>(() => {
    const spaceProviderBreadcrumbItem: BreadcrumbItem = {
      text: activeSpaceProvider.value.name,
      icon: getSpaceProviderIcon(activeSpaceProvider.value),
      clickable: true,
      onClick: () => {
        $router.push({
          name: APP_ROUTES.Home.SpaceSelectionPage,
          params: {
            spaceProviderId: activeSpaceProvider.value.id,
            groupId: "all",
          },
        });
      },
    };

    if (!isHubProvider.value || isShowingAllSpaces.value) {
      return [spaceProviderBreadcrumbItem];
    }

    const { spaceId } = $route.params;

    const spaceGroupBreadcrumbItem: BreadcrumbItem = {
      text: activeSpaceGroup.value!.name,
      // if spaceId is not found, then this will be the last item
      clickable: Boolean(spaceId),

      icon: getSpaceGroupIcon(activeSpaceGroup.value!),

      onClick: () => {
        $router.push({
          name: APP_ROUTES.Home.SpaceSelectionPage,
          params: {
            spaceProviderId: activeSpaceProvider.value.id,
            groupId: activeSpaceGroup.value!.id,
          },
        });
      },
    };

    const spaceBreadcrumbItem: BreadcrumbItem = {
      text: activeSpace.value?.name ?? "",
    };

    const base = [spaceProviderBreadcrumbItem, spaceGroupBreadcrumbItem];

    return base.concat(spaceId ? spaceBreadcrumbItem : []);
  });

  return { breadcrumbs };
};
