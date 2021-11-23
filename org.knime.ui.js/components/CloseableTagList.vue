<script>
import SelectableTagList from '~/components/SelectableTagList';
import ClosePopoverIcon from '~/webapps-common/ui/assets/img/icons/arrow-prev.svg?inline';
import { mixin as clickaway } from 'vue-clickaway2';

const defaultInitialTagCount = 5;

/**
 * Wraps a SelectableTagList and adds close buttons and click-away to it. The visible area overflows and looks like a
 * popover.
 */
export default {
    components: {
        SelectableTagList,
        ClosePopoverIcon
    },
    mixins: [clickaway],
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
        }
    },
    data() {
        return {
            displayAll: false
        };
    },
    methods: {
        onClick(tag) {
            this.displayAll = false;
            this.$emit('click', tag);
        }
    }
};
</script>

<template>
  <div
    v-on-clickaway="displayAll = false"
    class="closeable-tags"
  >
    <div class="popout">
      <SelectableTagList
        ref="tagList"
        :number-of-initial-tags="numberOfInitialTags"
        :selected-tags="selectedTags"
        :tags="tags"
        :show-all="displayAll"
        @show-more="displayAll = true"
        @click="onClick"
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
.closeable-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: left;
  align-items: start;

  & .popout {
    height: 61px;
    width: 100%;
  }

  & .wrapper {
    padding: 0 20px 13px;

    &.show-all {
      padding-bottom: 13px;
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
