<script setup lang="ts">
import DownloadAPButton from "../common/DownloadAPButton.vue";
</script>

<template>
  <div class="download-banner">
    <div class="info-text">
      <span>
        This is a demo version of KNIME Analytics Platform. Download the product
        for free to start building your own workflows.
      </span>
      <div class="links">
        <a href="https://www.knime.com/imprint" target="_blank">Imprint</a
        >&nbsp;
        <a href="https://www.knime.com/legal" target="_blank">Terms of use</a
        >&nbsp;
        <a href="https://www.knime.com/privacy" target="_blank">Privacy</a>
      </div>
    </div>

    <DownloadAPButton
      class="download-button"
      src="floating-action-button"
      on-dark
    />
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

  & .info-text {
    display: flex;
    flex-direction: column;

    & .links {
      font-size: 11px;
      padding-top: 5px;

      & a {
        color: var(--knime-silver-sand);

        &:hover {
          color: var(--knime-white);
        }
      }
    }
  }

  & .download-button {
    margin-left: auto;
  }
}
</style>
