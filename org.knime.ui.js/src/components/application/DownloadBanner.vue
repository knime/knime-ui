<script setup lang="ts">
import { knimeExternalUrls } from "@/plugins/knimeExternalUrls";
import DownloadAPButton from "../common/DownloadAPButton.vue";

const { IMPRINT_URL, LEGAL_URL, PRIVACY_URL } = knimeExternalUrls;
</script>

<template>
  <div class="download-banner">
    <div class="info-text">
      <span>
        This is a demo version of KNIME Analytics Platform. Download the product
        for free to start building your own workflows.
      </span>
      <div class="links">
        <a :href="IMPRINT_URL" target="_blank">Imprint</a>&nbsp;
        <a :href="LEGAL_URL" target="_blank">Terms of use</a>&nbsp;
        <a :href="PRIVACY_URL" target="_blank">Privacy</a>
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
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 var(--app-side-bar-buttons-width);
  color: var(--knime-white);
  background: var(--knime-masala);

  & .info-text {
    display: flex;
    flex-direction: column;

    & .links {
      padding-top: 5px;
      font-size: 11px;

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
