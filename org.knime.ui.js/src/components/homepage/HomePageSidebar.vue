<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";

import TimeIcon from "webapps-common/ui/assets/img/icons/time.svg";

import { APP_ROUTES } from "@/router/appRoutes";
import {
  NavMenu,
  NavMenuItem,
  type NavMenuItemProps,
} from "@/components/common/side-nav";

import SpacePageNavItems from "@/components/spaces/SpacePageNavItems.vue";
import HomePageContentTile from "./HomePageContentTile.vue";

const $router = useRouter();
const $route = useRoute();

const isGetStartedPageActive = computed(() => {
  return $route.name === APP_ROUTES.Home.GetStarted;
});

const recent = computed<NavMenuItemProps>(() => ({
  text: "Recent",
  icon: TimeIcon,
  active: isGetStartedPageActive.value,
  withIndicator: isGetStartedPageActive.value,
  highlighted: isGetStartedPageActive.value,
  onClick: () => $router.push({ name: APP_ROUTES.Home.GetStarted }),
}));
</script>

<template>
  <NavMenu>
    <NavMenuItem v-bind="recent">
      <template #prepend>
        <TimeIcon />
      </template>
    </NavMenuItem>

    <SpacePageNavItems />
  </NavMenu>

  <HomePageContentTile />
</template>
