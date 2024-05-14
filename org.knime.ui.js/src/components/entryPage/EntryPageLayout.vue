<script setup lang="ts">
import PageSideMenu from "@/components/common/PageSideMenu.vue";
</script>

<template>
  <section class="main-content-wrapper">
    <div class="flex-container">
      <div class="sidebar">
        <PageSideMenu />
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
  /* flex-direction: column; */
  flex-direction: row;
  background-color: var(--knime-white);
  color: var(--knime-masala);
  height: 100%;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  gap: 20px;
  justify-content: space-around;
  padding: 0;

  & .flex-container {
    display: flex;
    width: 100%;
    gap: 50px;
  }

  & .grid-container {
    height: 100%;
    width: 100%;
  }

  & .sidebar {
    padding: 100px 30px 0px 50px;
  }

  & .main-content {
    flex: 1;
  }
}
</style>
