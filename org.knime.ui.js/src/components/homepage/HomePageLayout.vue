<script setup lang="ts">
import HomePageSidebar from "./HomePageSidebar.vue";
import HubLoginBanner from "./HubLoginBanner.vue";
</script>

<template>
  <section class="main-content-wrapper">
    <div class="flex-container">
      <div class="sidebar">
        <div class="scroll-container">
          <HomePageSidebar />
        </div>
        <HubLoginBanner class="hub-login-banner" />
      </div>

      <div class="main-content">
        <RouterView />
      </div>
    </div>
  </section>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

section.main-content-wrapper {
  display: flex;
  flex-direction: row;
  gap: 20px;
  justify-content: space-around;
  width: 100%;
  height: 100%;
  padding: 0;
  color: var(--knime-masala);
  background-color: var(--knime-white);

  --sidebar-width: 420px;

  & .flex-container {
    display: flex;
    width: 100%;
  }

  & .sidebar {
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    max-height: calc(100vh - var(--app-header-height));

    & .scroll-container {
      padding: 24px;
      overflow-y: auto;
    }

    & .hub-login-banner {
      margin-top: auto;
    }
  }

  & .main-content {
    flex: 1;
    width: calc(100% - var(--sidebar-width));
    overflow: hidden auto;
  }
}
</style>
