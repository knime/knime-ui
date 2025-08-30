<script setup lang="ts">
import { Button } from "@knime/components";
import CloudUploadIcon from "@knime/styles/img/icons/cloud-upload.svg";

import RightPanelHeader from "../common/side-panel/RightPanelHeader.vue";

defineEmits(["close", "upload"]);
</script>

<template>
  <div class="version-panel-promote-hub-wrapper">
    <RightPanelHeader title="Version history" @close="$emit('close')" />

    <div class="version-list-container">
      <img
        src="/images/Versioning-history-illustration-product-hint.png"
        alt="List of versions"
        class="version-list"
      />
      <p class="description">
        To use the version history, connect and upload your workflow to the
        KNIME Hub. Store it in your space, track changes and restore older
        versions easily.
      </p>

      <Button primary compact @click="$emit('upload')">
        <CloudUploadIcon />
        Upload now
      </Button>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.version-panel-promote-hub-wrapper {
  width: 100%;
  height: 100%;

  & .version-list-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    padding: var(--space-16) var(--space-16) 0;

    & .version-list {
      width: 100%;
    }

    & .description {
      font-weight: 400;
      font-size: 13px;
      line-height: 150%;
      letter-spacing: 0%;
      vertical-align: middle;
      margin-bottom: var(--space-24);
      color: var(--knime-masala);
    }
  }
}
</style>
