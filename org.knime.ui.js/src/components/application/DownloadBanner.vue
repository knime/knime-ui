<script setup lang="ts">
import DownloadAPButton from "../common/DownloadAPButton.vue";
</script>

<template>
  <div class="download-banner">
    <span>
      This is only a demo of the KNIME Analytics Platform. Download for free to
      make use of the full potential
    </span>

    <DownloadAPButton class="download-button" src="floating-action-button" />
  </div>
</template>

<style lang="postcss" scoped>
.download-banner {
  z-index: 1;
  background: var(--knime-masala);
  color: var(--knime-white);
  display: flex;
  height: var(--app-download-banner-height);
  padding: 0 var(--app-side-bar-buttons-width);
  align-items: center;

  & .download-button {
    margin-left: auto;
  }
}
</style>
