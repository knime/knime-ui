<script setup lang="ts">
import { onMounted, ref } from "vue";

import Pill from "webapps-common/ui/components/Pill.vue";
import LinkExternalIcon from "webapps-common/ui/assets/img/icons/link-external.svg";
import Button from "webapps-common/ui/components/Button.vue";

import { API } from "@api";
import { retryAsyncCall } from "@/util/retryAsyncCall";

type ContentTileData = Awaited<ReturnType<typeof API.desktop.getHomePageTile>>;
const data = ref<ContentTileData | null>(null);

const fetchData = async () => {
  const retryDelayMS = 50;
  data.value = await retryAsyncCall(API.desktop.getHomePageTile, retryDelayMS);
};

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div v-if="data" class="content-tile-wrapper">
    <img class="image" :src="data.image" :alt="data.title" />

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
.content-tile-wrapper {
  background: var(--knime-gray-ultra-light);
  border-radius: 4px;
  box-shadow: var(--shadow-elevation-1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;

  & .image {
    display: flex;
    gap: 30px;
    border-radius: 4px 4px 0 0;
    object-fit: cover;
    max-height: 160px;
  }

  & .content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;

    & h4,
    p {
      font-size: 13px;
      line-height: 18px;
      margin: 0;
    }

    & ul {
      margin: 0;
      padding-left: 18px;
    }

    & .button {
      width: max-content;
    }
  }
}
</style>
