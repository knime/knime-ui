<script>
import SpaceExplorer from '@/components/spaceExplorer/SpaceExplorer.vue';
import ComputerDesktopIcon from '@/assets/computer-desktop.svg';

/**
 * Detects the scrollbar width of the current browser
 * @returns {Number}
 */
const getScrollbarWidth = () => {
    // Creating invisible container
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll'; // forcing scrollbar to appear
    outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
    document.body.appendChild(outer);

    // Creating inner element and placing it in the container
    const inner = document.createElement('div');
    outer.appendChild(inner);

    // Calculating difference between container's full width and the child width
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

    // Removing temporary elements from the DOM
    outer.parentNode.removeChild(outer);

    return scrollbarWidth;
};

/**
 * Determines whether the given element has Y overflow
 * @param {HTMLElement} element
 * @returns {Boolean}
 */
const isElementOverflowing = (element) => element.clientHeight < element.scrollHeight;

/**
 * Adds extra padding to target element's children depending on whether the target has overflow.
 * Padding amount will match the scrollbar width on the current OS's browser. This will avoid jumping
 * of the content when the scrollbars appear/disappear due to different content sizes
 *
 * @param {HTMLElement} target
 * @returns {void}
 */
const setExtraPadding = (target) => {
    if (!target) {
        return;
    }

    const scrollbarWidth = getScrollbarWidth();
    const isOverflowing = isElementOverflowing(target);

    // Apply padding to all of target's childrens instead of target itself to
    // make sure that the extra padding does not interfere with children's background colors
    target.childNodes.forEach(child => {
        const currentPadding = parseInt(
            getComputedStyle(child).getPropertyValue('padding-right'),
            10
        );
                  
        // account for existing paddings and add or remove the scrollbar width accordingly
        child.style.paddingRight = isOverflowing
            ? `${currentPadding - scrollbarWidth}px`
            : `${currentPadding + scrollbarWidth}px`;
    });
};

export default {
    components: {
        SpaceExplorer,
        ComputerDesktopIcon
    },

    mounted() {
        this.disconnectObserver = this.preventScrollJump();
    },

    beforeDestroy() {
        this.disconnectObserver?.();
    },

    methods: {
        preventScrollJump() {
            const main = this.$refs.main;

            setExtraPadding(main);
          
            const resizeObserver = new ResizeObserver(() => {
                setExtraPadding(main);
            });
            resizeObserver.observe(main);

            return () => {
                resizeObserver.disconnect();
            };
        }
    }
};
</script>

<template>
  <main ref="main">
    <header>
      <div class="grid-container">
        <div class="grid-item-12 space-info">
          <span class="space-type">
            <ComputerDesktopIcon class="space-icon" />
            Local space
          </span>
          <span class="space-name">Your Local Space</span>
        </div>
      </div>
    </header>

    <section class="toolbar-wrapper">
      <div class="grid-container">
        <div class="grid-item-12">
          <div class="toolbar" />
        </div>
      </div>
    </section>

    <section class="space-explorer-wrapper">
      <div class="grid-container">
        <div class="grid-item-12">
          <SpaceExplorer />
        </div>
      </div>
    </section>
  </main>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

main {
  display: flex;
  flex-direction: column;
  background-color: var(--knime-white);
}

header {
  font-family: Roboto, sans-serif;
  min-height: 150px;

  & .grid-container {
    height: 100%;
  }

  & .space-info {
    display: flex !important;
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
  }

  & .space-type {
    font-size: 16px;
    color: var(--knime-masala);
    display: flex;

    & .space-icon {
      @mixin svg-icon-size 18;

      margin-right: 5px;
      stroke: var(--knime-masala);
    }
  }

  & .space-name {
    font-size: 36px;
    font-weight: 700;
  }
}

.toolbar-wrapper {
  min-height: 60px;
  background: var(--knime-gray-light-semi);

  & .grid-container,
  & .grid-item-12,
  & .toolbar {
    height: 100%;
  }

  & .toolbar {
    display: flex;
    align-items: center;
  }
}

.space-explorer-wrapper {
  background: var(--knime-porcelain);
  padding-top: 50px;
  padding-bottom: 80px;
  flex: 1;
}
</style>
