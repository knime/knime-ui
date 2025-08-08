<script setup lang="ts">
import { computed } from "vue";

import { Button } from "@knime/components";
import DocumentationIcon from "@knime/styles/img/icons/file-text-stack.svg";

import type { References } from "@/components/kai/types";

const props = defineProps<{
  references: References;
}>();

const openInBrowser = (url: string) => {
  window.open(url);
};

const shouldRender = computed(
  () =>
    Object.keys(props.references).length &&
    Object.values(props.references).some((urls) => urls.length),
);
</script>

<template>
  <div v-if="shouldRender" class="references">
    <div class="title">
      <DocumentationIcon />
      Related topics
    </div>

    <div
      v-for="(urls, referenceName) in references"
      :key="referenceName"
      :urls="urls"
    >
      <template v-if="urls.length">
        <span class="reference-name">{{ referenceName }}: </span>
        <span v-for="(url, index) in urls" :key="index">
          <Button class="button" @click="openInBrowser(url)"
            >[{{ index + 1 }}]</Button
          ><span v-if="index < urls.length - 1">, </span>
        </span>
      </template>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

& .references {
  & .title {
    display: flex;
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 10px;

    & svg {
      @mixin svg-icon-size 20;

      margin-top: -1px;
      margin-right: 5px;
    }
  }

  & .reference-name {
    font-weight: 700;
  }

  & .button {
    all: unset;
    cursor: pointer;

    &:hover,
    &:focus {
      text-decoration: underline;
    }
  }
}
</style>
