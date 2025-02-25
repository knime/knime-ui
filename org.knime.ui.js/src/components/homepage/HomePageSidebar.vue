<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import TimeIcon from "@knime/styles/img/icons/time.svg";

import {
  NavMenu,
  NavMenuItem,
  type NavMenuItemProps,
} from "@/components/common/side-nav";
import SpacePageNavItems from "@/components/spaces/SpacePageNavItems.vue";
import { APP_ROUTES } from "@/router/appRoutes";

import HomePageContentTile from "./HomePageContentTile.vue";
import HubLoginBanner from "./HubLoginBanner.vue";

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
  <div class="sidebar-layout">
    <div class="sidebar-content">
      <NavMenu>
        <NavMenuItem v-bind="recent">
          <template #prepend>
            <TimeIcon />
          </template>
        </NavMenuItem>

        <SpacePageNavItems />
      </NavMenu>

      <HomePageContentTile />
    </div>
    <div class="sidebar-footer">
      <HubLoginBanner />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.sidebar-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.sidebar-footer {
  margin: 24px -24px -24px;
}
</style>
