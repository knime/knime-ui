<script lang="ts" setup>
import { computed, ref } from "vue";
import { onClickOutside } from "@vueuse/core";

import { TagList } from "@knime/components";
import ClosePopoverIcon from "@knime/styles/img/icons/arrow-prev.svg";

const maxLengthOfTagInChars = 31;
const maxLinesOfTags = 1;
const maxNumberOfInitialTags = 10;
const minNumberOfInitialTags = 1;

/**
 * Wraps a TagList and adds close buttons and click-away to it. The visible area overflows and looks like a
 * popover. Designed to work in NodeRepository. It has a dynamic number of initially shown tags based on the length
 * (number of chars) of a tag.
 */

interface Props {
  /**
   * List of tags to display. Not including active ones.
   */
  tags?: string[];
  /**
   * List of active tags to display.
   */
  modelValue?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  tags: () => [],
  modelValue: () => [],
});

interface Emits {
  (e: "update:modelValue", value: string[]): void;
}

const emit = defineEmits<Emits>();

const showAll = ref(false);

const numberOfInitialTags = computed(() => {
  let availableChars = maxLengthOfTagInChars * maxLinesOfTags;
  let tagsToShow = 0;

  // Count amount of tags that fit inside the limit of availableChars
  for (const tag of props.tags) {
    availableChars -= tag.length;
    if (availableChars > 0) {
      tagsToShow++;
    } else {
      break;
    }
  }
  // limit to lower and upper bound
  return Math.min(
    Math.max(tagsToShow, minNumberOfInitialTags),
    maxNumberOfInitialTags,
  );
});

const onTagClick = (tag: string) => {
  showAll.value = false;

  // remove from model value
  if (props.modelValue.includes(tag)) {
    emit(
      "update:modelValue",
      props.modelValue.filter((element) => element !== tag),
    );
    return;
  }

  // add to model
  emit("update:modelValue", [...props.modelValue, tag]);
};

const closeableTagsRef = ref<HTMLElement | null>(null);
onClickOutside(closeableTagsRef, () => {
  showAll.value = false;
});
</script>

<template>
  <div ref="closeableTagsRef" class="closeable-tags">
    <div class="popout">
      <TagList
        v-model:show-all="showAll"
        :class="['tag-list', { 'show-all': showAll }]"
        :number-of-initial-tags="numberOfInitialTags"
        :active-tags="modelValue"
        clickable
        sort-by-active
        :tags="tags"
        @click="onTagClick"
      />
      <button v-if="showAll" class="tags-popout-close" @click="showAll = false">
        <ClosePopoverIcon />
      </button>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.closeable-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: left;
  align-items: flex-start;

  & .popout {
    height: 30px;
    width: 100%;
  }

  & .tag-list {
    /* prevents wrapping due to small fails in the size heuristic */
    flex-wrap: nowrap;
    padding: 0 var(--sidebar-panel-padding) var(--space-8);

    /* limit tag length to a maximum */
    & :deep(.tag.clickable) {
      max-width: 250px;
      height: var(--space-24);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      line-height: 15px;
    }

    &.show-all {
      /* if all items are shown we need to wrap */
      flex-wrap: wrap;
      padding-bottom: 13px;

      /* The 230px is the fixed part of the apps header that has a fixed size. */
      max-height: calc(90vh - 230px);
      overflow: auto;
      background-color: var(--sidebar-background-color);
    }
  }

  & .tags-popout-close {
    position: relative;
    border: none;
    width: 100%;
    padding: 0;
    display: flex;
    height: 12px;
    justify-content: center;
    background-color: var(--knime-porcelain);
    cursor: pointer;
    border-bottom: 1px solid var(--knime-silver-sand);
    box-shadow: var(--knime-gray-dark-semi) 0 5px 6px;

    &::before {
      position: absolute;
      content: "";
      inset: 0;
      background-color: var(--knime-porcelain);
    }

    &:hover::before,
    &:focus-visible::before {
      background-color: var(--knime-silver-sand-semi);
    }

    & svg {
      @mixin svg-icon-size 10;

      stroke: var(--knime-masala);
      transform: rotate(90deg);
      transition: transform 0.3s ease;
    }
  }
}
</style>
