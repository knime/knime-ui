<script setup lang="ts">
import { onMounted, ref } from "vue";
import { API } from "@api";
import { storeToRefs } from "pinia";

import { Button, FunctionButton, Pill } from "@knime/components";
import CloseIcon from "@knime/styles/img/icons/close.svg";
import LinkExternalIcon from "@knime/styles/img/icons/link-external.svg";
import { promise } from "@knime/utils";

import { useApplicationStore } from "@/store/application/application";

const applicationStore = useApplicationStore();
const { dismissedHomePageTile } = storeToRefs(applicationStore);

type ContentTileData = Awaited<ReturnType<typeof API.desktop.getHomePageTile>>;
const data = ref<ContentTileData | null>(null);

const fetchData = async () => {
  data.value = await promise.retryPromise({
    fn: API.desktop.getHomePageTile,
    retryDelayMS: 50,
  });
};

onMounted(() => {
  if (dismissedHomePageTile.value) {
    return;
  }

  fetchData();
});

const dismissTile = () => {
  applicationStore.dismissedHomePageTile = true;
};
</script>

<template>
  <div v-if="data && !dismissedHomePageTile" class="content-tile-wrapper">
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  margin-top: var(--space-24);
  background: var(--knime-gray-ultra-light);
  border-radius: 4px;
  box-shadow: var(--shadow-elevation-1);

  & .close {
    display: none;
  }

  &:hover .close {
    position: absolute;
    top: var(--space-8);
    right: var(--space-8);
    display: block;
  }

  & .image {
    display: flex;
    gap: 30px;
    max-height: 160px;
    object-fit: cover;
    border-radius: var(--space-4) var(--space-4) 0 0;
  }

  & .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    padding: var(--space-16);

    & h4,
    p {
      margin: 0;
      font-size: 13px;
      line-height: 18px;
    }

    & .button {
      width: max-content;
    }
  }
}
</style>
