<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useStorage } from "@vueuse/core";

import { Button, FunctionButton, Pill } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";

import { API } from "@/api";
import { retryAsyncCall } from "@/util/retryAsyncCall";

const LOCAL_STORAGE_KEY = "home-page-tile";
const config = useStorage(LOCAL_STORAGE_KEY, {
  visible: true,
  hasRegisteredTeardown: false,
});

type ContentTileData = Awaited<ReturnType<typeof API.desktop.getHomePageTile>>;
const data = ref<ContentTileData | null>(null);

const fetchData = async () => {
  const retryDelayMS = 50;
  data.value = await retryAsyncCall(API.desktop.getHomePageTile, retryDelayMS);
};

const resetVisibleFlag = () => {
  // The value from localstorage is used only while the app is running,
  // so that the preference is retained while the user is on the app.
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

onMounted(() => {
  fetchData();

  if (!config.value.hasRegisteredTeardown) {
    window.addEventListener("beforeunload", resetVisibleFlag);
    config.value.hasRegisteredTeardown = true;
  }
});

const dismissTile = () => {
  config.value.visible = false;
};
</script>

<template>
  <div v-if="data && config.visible" class="content-tile-wrapper">
    <img class="image" :src="data.image" :alt="data.title" />
    <FunctionButton class="close" compact @click="dismissTile">
      <CloseIcon />
    </FunctionButton>

    <div class="content">
      <Pill v-if="data.tag" color="gray">{{ data.tag }}</Pill>
      <h4 class="title">{{ data.title }}</h4>
      <p>{{ data.text }}</p>

      <Button class="button" with-border compact :href="data.link">
        <LinkExternalIcon />
        {{ data["button-text"] }}
      </Button>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.content-tile-wrapper {
  background: var(--knime-gray-ultra-light);
  border-radius: 4px;
  box-shadow: var(--shadow-elevation-1);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  margin-top: var(--space-24);
  position: relative;

  & .close {
    display: none;
  }

  &:hover .close {
    display: block;
    position: absolute;
    right: var(--space-8);
    top: var(--space-8);
  }

  & .image {
    display: flex;
    gap: 30px;
    border-radius: var(--space-4) var(--space-4) 0 0;
    object-fit: cover;
    max-height: 160px;
  }

  & .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    padding: var(--space-16);

    & h4,
    p {
      font-size: 13px;
      line-height: 18px;
      margin: 0;
    }

    & .button {
      width: max-content;
    }
  }
}
</style>
