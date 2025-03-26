<script setup lang="ts">
import { Button } from "@knime/components";
import CloudUploadIcon from "@knime/styles/img/icons/cloud-upload.svg";

import CloseButton from "../common/CloseButton.vue";

defineEmits(["close", "upload"]);
</script>

<template>
  <div class="version-panel-promote-hub-wrapper">
    <div class="header">
      <h6>Version history</h6>
      <CloseButton @close.stop="$emit('close')" />
    </div>
    <div class="version-list-container">
      <img
        src="/images/Versioning-history-illustration-product-hint.png"
        alt="List of versions"
        class="version-list"
      />
      <div class="version-list-gradient" />
    </div>
    <p class="description">
      To use the version history, connect and upload your workflow to the KNIME
      Hub. Store it in your space, track changes and restore older versions
      easily.
    </p>
    <Button primary compact @click="$emit('upload')"
      ><CloudUploadIcon />Upload now</Button
    >
  </div>
</template>

<style lang="postcss" scoped>
.version-panel-promote-hub-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: var(--space-16) var(--space-16) 0;

  & .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--knime-silver-sand);

    & h6 {
      margin: 0;
      font-weight: 500;
      font-size: 16px;
      line-height: 28px;
      color: var(--knime-masala);
    }
  }

  & .version-list-container {
    position: relative;

    & .version-list {
      width: 100%;
    }

    & .version-list-gradient {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        to bottom,
        rgb(248 249 250 / 0%) 0%,
        rgb(248 249 250 / 100%) 100%
      );
    }
  }

  & .description {
    font-weight: 400;
    font-size: 13px;
    line-height: 150%;
    letter-spacing: 0%;
    vertical-align: middle;
    margin-top: var(--space-16);
    margin-bottom: var(--space-24);
    color: var(--knime-masala);
  }
}
</style>
