<script>
import Tag from '~/webapps-common/ui/components/Tag';

export const defaultInitialTagCount = 5;

/**
 * TagList where Tags can be selected. It has a `tags` prop with all tags and a `value` which contains the
 * selected tags. Implements the v-model pattern and thus emits @input with the new value (array of selected tags)
 */
export default {
    components: {
        Tag
    },
    props: {
        /**
         * Maximum number of tags to display initially.
         * If more tags are present, they will be expandable via a '+' button.
         */
        numberOfInitialTags: {
            type: Number,
            default: defaultInitialTagCount
        },
        /**
         * List of tags (strings) to display. Including selected ones.
         */
        tags: {
            type: Array,
            default: () => []
        },
        /**
         * List of selected tags as strings.
         */
        value: {
            type: Array,
            default: () => []
        },
        /**
         * Show all tags
         */
        showAll: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            displayAll: this.showAll
        };
    },
    computed: {
        tagObjects() {
            // the tags should keep their "natural" order but the selected ones need to be at the head of the list
            const allTags = this.value.concat(this.tags.filter(tagText => !this.value.includes(tagText)));
            // transform to an object based list with text and selected attribute
            return allTags.map(tagText => ({ text: tagText, selected: this.value.includes(tagText) }));
        },
        tagsToDisplay() {
            if (this.displayAll) {
                return this.tagObjects;
            }
            return this.tagObjects.slice(0, this.numberOfInitialTags);
        },
        hasMoreTags() {
            return !this.displayAll && this.tagObjects.length > this.numberOfInitialTags;
        },
        allVisibleAreSelected() {
            return !this.displayAll && this.value.length > this.numberOfInitialTags;
        },
        moreDisplayText() {
            if (this.allVisibleAreSelected) {
                const selectedInvisibleTags = this.value.length - this.numberOfInitialTags;
                return `+${selectedInvisibleTags}/${this.tags.length}`;
            } else {
                return `+${this.tagObjects.length - this.numberOfInitialTags}`;
            }
        }
    },
    watch: {
        showAll(newVal) {
            this.displayAll = newVal;
        }
    },
    methods: {
        onClick(tag) {
            if (tag.selected) {
                this.$emit('input', this.value.filter(x => x !== tag.text));
            } else {
                this.$emit('input', [...this.value, tag.text]);
            }
        },
        onShowMore() {
            this.displayAll = true;
            this.$emit('show-more');
        }
    }
};
</script>

<template>
  <div
    v-if="tagObjects.length"
    :class="['wrapper', {'show-all': displayAll }]"
  >
    <Tag
      v-for="(tag, index) in tagsToDisplay"
      :key="index"
      clickable
      :class="{selected: tag.selected}"
      @click.native.prevent="onClick(tag)"
    >
      {{ tag.text }}
      <slot name="icon" />
    </Tag>
    <Tag
      v-if="hasMoreTags"
      class="more-tags clickable"
      @click.native.prevent="onShowMore"
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

    &.clickable {
      &:hover {
        color: var(--knime-dove-gray);
        background-color: transparent;
        text-decoration: line-through;
        border-color: var(--knime-dove-gray);

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
}

.more-tags {
  cursor: pointer;
}
</style>
