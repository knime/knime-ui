<script>
import SelectableTagList from '~/components/common/SelectableTagList';
import ClosePopoverIcon from '~/webapps-common/ui/assets/img/icons/arrow-prev.svg?inline';
import { mixin as clickaway } from 'vue-clickaway2';

const maxLengthOfTagInChars = 31;
const maxLinesOfTags = 2;
export const maxNumberOfInitialTags = 10;
export const minNumberOfInitialTags = 2;

/**
 * Wraps a SelectableTagList and adds close buttons and click-away to it. The visible area overflows and looks like a
 * popover. Designed to work in NodeRepository. It has a dynamic number of initially shown tags based on the length
 * (number of chars) of a tag.
 *
 * This is not a common component as the sizes and most of the styles are carefully chosen
 * to fit in the sidebar (NodeRepo)
 */
export default {
    components: {
        SelectableTagList,
        ClosePopoverIcon
    },
    mixins: [clickaway],
    props: {
        /**
         * List of tags (Strings) to display. Not including selected ones.
         */
        tags: {
            type: Array,
            default: () => []
        },
        /**
         * List of selected tags (Strings) to display.
         */
        value: {
            type: Array,
            default: () => []
        }
    },
    data() {
        return {
            displayAll: false
        };
    },
    computed: {
        numberOfInitialTags() {
            let availableChars = maxLengthOfTagInChars * maxLinesOfTags;
            let tagsToShow = 0;

            for (let tag of this.tags) {
                availableChars -= tag.length;
                if (availableChars > 0) {
                    tagsToShow++;
                } else {
                    break;
                }
            }
            // limit to lower and upper bound
            return Math.min(Math.max(tagsToShow, minNumberOfInitialTags), maxNumberOfInitialTags);
        }
    },
    methods: {
        onInput(value) {
            this.hideMore();
            this.$emit('input', value);
        },
        hideMore() {
            this.displayAll = false;
        },
        showMore() {
            this.displayAll = true;
        }
    }
};
</script>

<template>
  <div
    v-on-clickaway="hideMore"
    class="closeable-tags"
  >
    <div class="popout">
      <SelectableTagList
        ref="tagList"
        :number-of-initial-tags="numberOfInitialTags"
        :value="value"
        :tags="tags"
        :show-all="displayAll"
        @show-more="showMore"
        @input="onInput"
      />
      <button
        v-if="displayAll"
        class="tags-popout-close"
        @click="hideMore"
      >
        <ClosePopoverIcon />
      </button>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.closeable-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: left;
  align-items: flex-start;

  & .popout {
    height: 61px;
    width: 100%;
  }

  & .wrapper {
    padding: 0 20px 13px;

    /* limit tag length to a maximum */
    & >>> .tag.clickable {
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
      content: '';
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--knime-porcelain);
    }

    &:hover::before {
      background-color: var(--knime-silver-sand-semi);
    }

    & svg {
      width: 10px;
      height: 10px;
      stroke: var(--knime-masala);
      stroke-width: calc(32px / 10);
      transform: rotate(90deg);
      transition: transform 0.3s ease;
    }
  }
}
</style>
