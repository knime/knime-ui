<script setup lang="ts">
import KaiSidebar from "@/components/kaiSidebar/KaiSidebar.vue";
import { Button } from "@knime/components";
import GoBackIcon from "@knime/styles/img/icons/arrow-back.svg";

const emit = defineEmits(["menuBack"]);
</script>

<template>
  <div class="quick-build-menu">
    <div class="header">
      KNIME AI building mode
      <Button with-border @click="$emit('menuBack')"><GoBackIcon /></Button>
    </div>
    <div class="main">
      <KaiSidebar />
    </div>
    <div class="footer"></div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .quick-build-menu {
  padding: 8px;

  & .header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    font-weight: 500;
    line-height: 28px;
    font-size: 16px;
    border-bottom: 1px solid var(--knime-silver-sand);
  }
}
</style>
