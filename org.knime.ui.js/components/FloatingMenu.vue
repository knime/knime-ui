<script>

const SET_FOCUS_TIMEOUT = 1;
const FOCUSOUT_TIMEOUT = 25;

/*
 * The floating menu is a menu similar to the SubMenu but it has a fixed position and not slots or buttons.
 * Created for the ContextMenu.
 */

export default {
    props: {
        /**
         * Items to be listed in the menu.
         * Each item has a `text`, optional `icon` and optional `to` / `href` properties, where `to` is for router-links
         * and `href` for standard (e.g. external) links.
         * @example
           [{
              href: 'http://apple.com',
              text: 'Apples',
              icon: HelpIcon,
              disabled: true,
              helpText: 'CTRL + A'
           }, {
              href: 'https://en.wikipedia.org/wiki/Orange_(colour)',
              text: 'Oranges',
              icon: StarIcon
           },  {
              to: '/testing-nuxt-link',
              text: 'Ananas',
              helpText: 'F9'
           }]
         */
        items: {
            required: true,
            type: Array
        },
        /**
         * Identifier for click handler
         */
        id: {
            default: '',
            type: String
        },
        ariaLabel: {
            type: String,
            default: 'menu'
        },
        top: {
            type: Number,
            required: true
        },
        left: {
            type: Number,
            required: true
        }
    },
    data() {
        return {
            isVisible: this.visible
        };
    },
    computed: {
        /**
         * @returns {Array<Element>} - HTML Elements to use for focus and events.
         */
        listItems() {
            return this.$refs.listItem.map(el => el.$el || el);
        },
        positionStyle() {
            return this.isVisible ? { left: `${this.left}px`, top: `${this.top}px` } : null;
        }
    },
    methods: {
        /**
         * Returns the next HTML Element from the list of items. If the current focused Element is at the top or bottom
         * of the list, this method will return the opposite end.
         *
         * @param {Number} changeInd - the positive or negative index shift for the next Element (usually 1 || -1).
         * @returns {Element} - the next option Element in the list of items.
         */
        getNextElement(changeInd) {
            return this.listItems[this.listItems.indexOf(document.activeElement) + changeInd] || (changeInd < 0
                ? this.listItems[this.listItems.length - 1]
                : this.listItems[0]);
        },
        /**
         * Items can behave as links (either nuxt or native <a>) or buttons. If button behavior is expected, we want to
         * prevent bubbling, as well as blur/focus out events. For keyboard navigation, links and buttons need to be
         * treated differently. Buttons should react on 'space' and links on 'enter'.
         *
         * @param {Object} event - browser event.
         * @param {Object} item - submenu item which was clicked.
         * @returns {undefined}
         * @emits {item-click}
         */
        onItemClick(event, item) {
            console.log(item);
            if (item.disabled) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                return;
            }
            let isButton = !(item.href || item.to);
            if (isButton) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            } else if (event.type !== 'click') {
                if (event.code === 'Space') {
                    return;
                }
                /* Handle "Enter" on links. Nuxt-link with `to: { name: 'namedRoute' }` do not have an href property
                and will not automatically react to keyboard events. We must trigger the click to activate the nuxt
                event listener. */
                let newEvent = new Event('click');
                event.target.dispatchEvent(newEvent);
            }
            this.$emit('item-click', event, item, this.id);
            this.closeMenu();
        },
        /* Handle arrow key "up" events. */
        onUp() {
            this.getNextElement(-1).focus();
        },
        /* Handle arrow key "down" events. */
        onDown() {
            this.getNextElement(1).focus();
        },
        onFocusOut(e) {
            setTimeout(() => {
                if (this.listItems && !this.listItems.includes(document.activeElement)) {
                    this.closeMenu();
                }
            }, FOCUSOUT_TIMEOUT);
        },
        closeMenu() {
            this.isVisible = false;
        },
        showMenu() {
            this.isVisible = true;
            setTimeout(() => {
                this.getNextElement(0).focus();
            }, SET_FOCUS_TIMEOUT);
        },
        /*
         * Manually prevents default event bubbling and propagation for methods which fire blur/focusout events that
         * interfere with the refocusing behavior. This allows the timeout to be set extremely low.
         */
        onPreventEvent(event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }
    }
};
</script>

<template>
  <div
    ref="floatingmenu"
    :class="['floatingmenu', { isVisible }]"
    :style="positionStyle"
    @keydown.esc.stop.prevent="closeMenu"
    @keydown.up.stop.prevent="onUp"
    @keydown.down.stop.prevent="onDown"
    @focusout.stop="onFocusOut"
    @mousedown="onPreventEvent"
  >
    <ul
      ref="list"
      :aria-label="ariaLabel"
      role="menu"
    >
      <li
        v-for="(item, index) in items"
        :key="index"
        @click="onItemClick($event, item)"
        @keydown.enter="onItemClick($event, item)"
        @keydown.space="onItemClick($event, item)"
      >
        <Component
          :is="item.to ? 'nuxt-link' : 'a'"
          ref="listItem"
          tabindex="0"
          :class="['clickable-item', { disabled: item.disabled }]"
          :to="item.to"
          :href="item.href || null"
        >
          <Component
            :is="item.icon"
            v-if="item.icon"
            class="item-icon"
          />
          {{ item.text }} | {{ item.helpText }}
        </Component>
      </li>
    </ul>
  </div>
</template>

<style lang="postcss" scoped>
@import "webapps-common/ui/css/variables";

.floatingmenu {
  position: absolute;
  display: block;

  /* use visibility top/left negative and z-index to have a proper size which we need for position calculation */
  top: -1000px;
  left: -1000px;
  visibility: hidden;

  &.isVisible {
    visibility: visible;
    & ul {
      z-index: var(--z-index-common-inline-menu, 1);
    }
  }

  & ul {
    margin: 0;
    padding: 0;
    background-color: var(--knime-white);
    color: var(--theme-dropdown-foreground-color);
    font-size: 13px;
    line-height: 18px;
    font-weight: 500;
    font-family: var(--theme-text-medium-font-family);
    text-align: left;
    list-style-type: none;
    box-shadow: 0 1px 4px 0 var(--knime-gray-dark-semi);
    z-index: -100;

    & .disabled { /* via class since <a> elements don't have a native disabled attribute */
      opacity: 0.5;
    }

    & a {
      padding: 6px 13px;
      display: flex;
      align-items: center;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;

      & .item-icon {
        stroke: var(--theme-dropdown-foreground-color);
        width: 18px;
        height: 18px;
        margin-right: 7px;
      }

      &:hover {
        outline: none;
        background-color: var(--theme-dropdown-background-color-hover);
        color: var(--theme-dropdown-foreground-color-hover);

        & .item-icon {
          stroke: var(--theme-dropdown-foreground-color-hover);

          & .text {
            stroke: var(--theme-dropdown-foreground-color-hover);
          }
        }
      }

      &:active,
      &:focus {
        outline: none;
        background-color: var(--theme-dropdown-background-color-focus);
        color: var(--theme-dropdown-foreground-color-focus);

        & .item-icon {
          stroke: var(--theme-dropdown-foreground-color-focus);

          & .text {
            stroke: var(--theme-dropdown-foreground-color-focus);
          }
        }
      }
    }
  }
}
</style>
