<script lang="ts">
import { defineComponent, type PropType } from "vue";
import { difference } from "lodash-es";
import { Tag } from "@knime/components";

export const defaultInitialTagCount = 5;

type ShownTag = {
  text: string;
  selected: boolean;
};

/**
 * TagList where Tags can be selected. It has a `tags` prop with all tags and a `modelValue` which contains the
 * selected tags. Implements the v-model pattern and thus emits @modelValue with the new value (array of selected tags)
 */
export default defineComponent({
  components: {
    Tag,
  },
  props: {
    /**
     * Maximum number of tags to display initially.
     * If more tags are present, they will be expandable via a '+' button.
     */
    numberOfInitialTags: {
      type: Number,
      default: defaultInitialTagCount,
    },
    /**
     * List of tags (strings) to display. Including selected ones.
     */
    tags: {
      type: Array as PropType<Array<string>>,
      default: () => [],
    },
    /**
     * List of selected tags as strings.
     */
    modelValue: {
      type: Array as PropType<Array<string>>,
      default: () => [],
    },
    /**
     * Show all tags
     */
    showAll: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue", "showMore"],
  computed: {
    sortedTags(): Array<ShownTag> {
      // the tags should keep their "natural" order but the selected ones need to be at the head of the list
      // transform to an object based list with text and selected attribute
      return [
        ...this.modelValue.map((text) => ({ text, selected: true })),

        ...difference(this.tags, this.modelValue).map((text) => ({
          text,
          selected: false,
        })),
      ];
    },

    shownTags() {
      return this.showAll
        ? this.sortedTags
        : this.sortedTags.slice(0, this.numberOfInitialTags);
    },

    hasMoreTags() {
      return !this.showAll && this.tags.length > this.numberOfInitialTags;
    },

    allVisibleAreSelected() {
      return !this.showAll && this.modelValue.length > this.numberOfInitialTags;
    },

    moreDisplayText() {
      let hiddenTags = this.tags.length - this.numberOfInitialTags;
      if (this.allVisibleAreSelected) {
        const selectedInvisibleTags =
          this.modelValue.length - this.numberOfInitialTags;
        return `+${selectedInvisibleTags}/${hiddenTags}`;
      } else {
        return `+${hiddenTags}`;
      }
    },
  },
  methods: {
    onClick(tag: ShownTag) {
      if (tag.selected) {
        this.$emit(
          "update:modelValue",
          this.modelValue.filter((x) => x !== tag.text),
        );
      } else {
        this.$emit("update:modelValue", [...this.modelValue, tag.text]);
      }
    },

    async onShowMore(nextTagIndex: number) {
      this.$emit("showMore");
      // this assumes we get more items and puts the focus on the next one
      await this.$nextTick();
      (this.$refs.tags as InstanceType<typeof Tag>[])?.[
        nextTagIndex
      ]?.$el.focus();
    },
  },
});
</script>

<template>
  <div v-if="shownTags.length" :class="['wrapper', { 'show-all': showAll }]">
    <Tag
      v-for="tag in shownTags"
      ref="tags"
      :key="tag.text"
      clickable
      tabindex="0"
      :class="{ selected: tag.selected }"
      @click.prevent="onClick(tag)"
      @keydown.enter.stop.prevent="onClick(tag)"
    >
      {{ tag.text }}
      <slot name="icon" />
    </Tag>
    <Tag
      v-if="hasMoreTags"
      class="more-tags clickable"
      tabindex="0"
      @click.prevent.stop="onShowMore(shownTags.length)"
      @keydown.enter.stop.prevent="onShowMore(shownTags.length)"
    >
      {{ moreDisplayText }}
    </Tag>
  </div>
</template>

<style lang="postcss" scoped>
.wrapper {
  display: flex;
  flex-wrap: wrap;

  & .selected {
    color: var(--knime-white);
    background-color: var(--knime-masala);
    border-color: var(--knime-masala);

    & svg {
      stroke: var(--knime-white);
    }
  }

  & .tag:focus-visible {
    color: var(--knime-white);
    background-color: var(--knime-dove-gray);
    border-color: var(--knime-dove-gray);
    text-decoration: underline;
    outline: none;

    & > svg {
      stroke: var(--knime-white);
    }
  }

  &.selected.clickable {
    &:hover {
      text-decoration: line-through;

      & svg {
        stroke: var(--knime-dove-gray);
      }
    }

    &:active {
      color: var(--knime-masala);
      background-color: transparent;
      text-decoration: line-through;
      border-color: var(--knime-masala);

      & svg {
        stroke: var(--knime-masala);
      }
    }
  }
}

.more-tags {
  cursor: pointer;
}
</style>
