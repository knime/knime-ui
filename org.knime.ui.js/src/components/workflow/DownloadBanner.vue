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
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  background: var(--knime-masala);
  color: var(--knime-white);
  display: flex;
  padding: 20px 40px;
  align-items: center;

  & .download-button {
    margin-left: auto;
  }
}
</style>
