<script>
import Tag from '~/webapps-common/ui/components/Tag';

const defaultInitialTagCount = 5;

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
         * List of tags (Strings) to display. Not including selected ones.
         * @type Array<String>
         */
        tags: {
            type: Array,
            default: () => []
        },
        /**
         * List of selected tags (Strings) to display.
         * @type Array<String>
         */
        selectedTags: {
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
        allTags() {
            return this.selectedTags.map(x => ({ text: x, selected: true }))
                .concat(this.tags.map(x => ({ text: x, selected: false })));
        },
        tagsToDisplay() {
            if (this.displayAll) {
                return this.allTags;
            }
            return this.allTags.slice(0, this.numberOfInitialTags);
        },
        hasMoreTags() {
            return !this.displayAll && this.allTags.length > this.numberOfInitialTags;
        },
        allVisibleAreSelected() {
            return !this.displayAll && this.selectedTags.length > this.numberOfInitialTags;
        },
        moreDisplayText() {
            if (this.allVisibleAreSelected) {
                const selectedInvisibleTags = this.selectedTags.length - this.numberOfInitialTags;
                return `+${selectedInvisibleTags}/${this.tags.length}`;
            } else {
                return `+${this.allTags.length - this.numberOfInitialTags}`;
            }
        }
    },
    watch: {
        showAll(newVal, oldVal) {
            this.displayAll = newVal;
        }
    },
    methods: {
        onClick(tag) {
            this.$emit('click', tag);
        },
        onShowMore() {
            this.displayAll = true;
            this.$emit('show-more', this.displayAll);
        }
    }
};
</script>

<template>
  <div
    v-if="allTags.length"
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
    </Tag><!-- no whitespace
    -->
    <Tag
      v-if="hasMoreTags"
      class="more-tags"
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

    &.clickable:hover {
      color: var(--knime-dove-gray);
      background-color: transparent;
      text-decoration: line-through;
      border-color: var(--knime-dove-gray);

      & svg {
        stroke: var(--knime-dove-gray);
      }
    }
  }
}

.more-tags {
  cursor: pointer;
}
</style>
