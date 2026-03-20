<script setup lang="ts">
import CodeHtmlIcon from "@knime/styles/img/icons/code-html.svg";

import type { LayoutEditorHtmlItem } from "@/store/layoutEditor/types/view";

type Props = {
  item: LayoutEditorHtmlItem;
};
defineProps<Props>();
</script>

<template>
  <div class="html-view">
    <CodeHtmlIcon class="icon" />
    <div class="name">Custom HTML</div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@knime/styles/css/mixins.css");

.html-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  padding: 10px;
  font-size: 13px;
  user-select: none;
  background-color: var(--knime-silver-sand-semi);
  border-radius: 3px;

  & .name {
    font-weight: bold;
  }

  & .icon {
    @mixin svg-icon-size 16;
  }
}
</style>
