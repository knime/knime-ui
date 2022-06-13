<script>
import Tag from '~/webapps-common/ui/components/Tag';
import { difference } from 'lodash';

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
    computed: {
        sortedTags() {
            // the tags should keep their "natural" order but the selected ones need to be at the head of the list
            // transform to an object based list with text and selected attribute
            return [
                ...this.value
                    .map(text => ({ text, selected: true })),
                ...difference(this.tags, this.value)
                    .map(text => ({ text, selected: false }))
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
            return !this.showAll && this.value.length > this.numberOfInitialTags;
        },
        moreDisplayText() {
            let hiddenTags = this.tags.length - this.numberOfInitialTags;
            if (this.allVisibleAreSelected) {
                const selectedInvisibleTags = this.value.length - this.numberOfInitialTags;
                return `+${selectedInvisibleTags}/${hiddenTags}`;
            } else {
                return `+${hiddenTags}`;
            }
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
            this.$emit('show-more');
        }
    }
};
</script>

<template>
  <div
    v-if="shownTags.length"
    :class="['wrapper', {'show-all': showAll }]"
  >
    <Tag
      v-for="tag in shownTags"
      :key="tag.text"
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
}

.more-tags {
  cursor: pointer;
}
</style>
