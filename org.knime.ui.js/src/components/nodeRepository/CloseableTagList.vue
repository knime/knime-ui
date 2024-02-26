<script lang="ts" setup>
import ClosePopoverIcon from "webapps-common/ui/assets/img/icons/arrow-prev.svg";
import SelectableTagList from "@/components/common/SelectableTagList.vue";
import { computed, ref } from "vue";
import { onClickOutside } from "@vueuse/core";

const maxLengthOfTagInChars = 31;
const maxLinesOfTags = 1;
const maxNumberOfInitialTags = 10;
const minNumberOfInitialTags = 1;

/**
 * Wraps a SelectableTagList and adds close buttons and click-away to it. The visible area overflows and looks like a
 * popover. Designed to work in NodeRepository. It has a dynamic number of initially shown tags based on the length
 * (number of chars) of a tag.
 */

interface Props {
  /**
   * List of tags (Strings) to display. Not including selected ones.
   */
  tags?: string[];
  /**
   * List of selected tags (Strings) to display.
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

const displayAll = ref(false);

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

const onUpdateModelValue = (value: string[]) => {
  displayAll.value = false;
  emit("update:modelValue", value);
};

const closeableTagsRef = ref<HTMLElement | null>(null);
onClickOutside(closeableTagsRef, () => {
  displayAll.value = false;
});
</script>

<template>
  <div ref="closeableTagsRef" class="closeable-tags">
    <div class="popout">
      <SelectableTagList
        ref="tagList"
        :number-of-initial-tags="numberOfInitialTags"
        :model-value="modelValue"
        :tags="tags"
        :show-all="displayAll"
        @show-more="displayAll = true"
        @update:model-value="onUpdateModelValue"
      />
      <button
        v-if="displayAll"
        class="tags-popout-close"
        @click="displayAll = false"
      >
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

  & .wrapper {
    padding: 0 20px 13px;

    /* limit tag length to a maximum */
    & :deep(.tag.clickable) {
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      line-height: 15px;

      &:hover {
        text-decoration: none;
        background-color: var(--knime-dove-gray);
        border-color: var(--knime-dove-gray);
      }
    }

    /* Checked icon */
    & :deep(.tag.clickable.selected)::after {
      border-color: var(--knime-white);
      border-style: solid;
      border-width: 0 0 1.3px 1.3px;
      content: "";
      display: block;
      height: 5px;
      margin-right: 3px;
      position: relative;
      top: -5px;
      transform: translate(4px, 3.5px) rotate(-45deg);
      width: 8px;
    }

    &.show-all {
      padding-bottom: 13px;

      /* The 230px is the fixed part of the apps header that has a fixed size. */
      max-height: calc(90vh - 230px);
      overflow: auto;
      background: var(--knime-gray-ultra-light);
    }
  }

  & .tags-popout-close {
    position: relative;
    z-index: 1;
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

    &:hover::before {
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
