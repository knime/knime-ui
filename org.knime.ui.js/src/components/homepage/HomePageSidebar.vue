<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { NavMenu, NavMenuItem, type NavMenuItemProps } from "@knime/components";
import TimeIcon from "@knime/styles/img/icons/time.svg";

import SpacePageNavItems from "@/components/spaces/SpacePageNavItems.vue";
import { APP_ROUTES } from "@/router/appRoutes";

import HomePageContentTile from "./HomePageContentTile.vue";

const $route = useRoute();

const isGetStartedPageActive = computed(() => {
  return $route.name === APP_ROUTES.Home.GetStarted;
});

const recent = computed<NavMenuItemProps>(() => ({
  to: {
    name: APP_ROUTES.Home.GetStarted,
  },
  text: "Recent",
  icon: TimeIcon,
  active: isGetStartedPageActive.value,
}));
</script>

<template>
  <NavMenu :link-component="RouterLink">
    <NavMenuItem v-bind="recent">
      <template #prepend>
        <TimeIcon />
      </template>
    </NavMenuItem>

    <SpacePageNavItems />
  </NavMenu>

  <HomePageContentTile />
</template>
