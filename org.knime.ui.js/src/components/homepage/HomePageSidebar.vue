<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter, useRoute } from "vue-router";

import RocketIcon from "webapps-common/ui/assets/img/icons/rocket.svg";

import { APP_ROUTES } from "@/router/appRoutes";
import {
  SidebarNav,
  SidebarNavItem,
  type SidebarNavItemType,
} from "@/components/common/side-nav";

import SpacePageNavItems from "@/components/spaces/SpacePageNavItems.vue";

const isSkeletonShown = ref(true);

const $router = useRouter();
const $route = useRoute();

const isGetStartedPageActive = computed(() => {
  return $route.name === APP_ROUTES.Home.GetStarted;
});

const recent = computed<SidebarNavItemType>(() => ({
  id: "get-started",
  text: "Get started",
  hoverable: true,
  icon: RocketIcon,
  active: isGetStartedPageActive.value,
  clickable: true,
  onClick: () => $router.push({ name: APP_ROUTES.Home.GetStarted }),
}));
</script>

<template>
  <SidebarNav :show-skeleton="isSkeletonShown">
    <SidebarNavItem :item="recent" />

    <SpacePageNavItems @loading="isSkeletonShown = $event" />
  </SidebarNav>
</template>
