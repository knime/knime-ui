<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";

import TimeIcon from "webapps-common/ui/assets/img/icons/time.svg";

import { APP_ROUTES } from "@/router/appRoutes";
import {
  NavMenu,
  NavMenuItem,
  type NavMenuItemType,
} from "@/components/common/side-nav";

import SpacePageNavItems from "@/components/spaces/SpacePageNavItems.vue";
import CommunityHubPromoCard from "@/components/spaces/CommunityHubPromoCard.vue";

const $router = useRouter();
const $route = useRoute();

const isGetStartedPageActive = computed(() => {
  return $route.name === APP_ROUTES.Home.GetStarted;
});

const recent = computed<NavMenuItemType>(() => ({
  id: "recent",
  text: "Recent",
  hoverable: true,
  icon: TimeIcon,
  active: isGetStartedPageActive.value,
  clickable: true,
  onClick: () => $router.push({ name: APP_ROUTES.Home.GetStarted }),
}));
</script>

<template>
  <NavMenu>
    <NavMenuItem :item="recent">
      <template #prepend>
        <TimeIcon />
      </template>
    </NavMenuItem>

    <SpacePageNavItems />
  </NavMenu>

  <CommunityHubPromoCard />
</template>
