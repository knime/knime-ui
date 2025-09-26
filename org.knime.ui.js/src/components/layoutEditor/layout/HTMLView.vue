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
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--knime-silver-sand-semi);
  border-radius: 3px;
  user-select: none;
  padding: 10px;
  font-size: 13px;

  & .name {
    font-weight: bold;
  }

  & .icon {
    @mixin svg-icon-size 16;
  }
}
</style>
