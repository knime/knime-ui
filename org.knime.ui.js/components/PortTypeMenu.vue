<script>
import { mapState, mapGetters } from 'vuex';
import FloatingMenu from '~/components/FloatingMenu';
import portIcon from '~/components/output/PortIconRenderer';
import MenuItems from '~/webapps-common/ui/components/MenuItems';
import SearchBar from '~/components/noderepo/SearchBar.vue';

/**
 * ContextMenu offers actions for the Kanvas based on the selected nodes.
 */

export default {
    components: {
        FloatingMenu,
        MenuItems,
        SearchBar
    },
    props: {
        /**
         * Absolute position of the menu. It's relative to the next absolute/relative positioned parent.
         */
        position: {
            type: Object,
            required: true,
            validator: position => typeof position.x === 'number' && typeof position.y === 'number'
        },
        side: {
            type: String,
            required: true,
            validator: side => ['input', 'output'].includes(side)
        }
    },
    data: () => ({
        searchValue: ''
    }),
    computed: {
        ...mapState('canvas', ['zoomFactor']),
        ...mapState('application', ['availablePortTypes', 'suggestedPortTypes']),
        ...mapGetters('application', ['portTypeSearch']),
        headerMargin() {
            // the x-position of the header text has to be adjusted for the growing/shrinking add-port-button
            let distanceToPort = this.$shapes.portSize * Math.pow(this.zoomFactor, 0.8); // eslint-disable-line no-magic-numbers
            return `${distanceToPort + 1}px`;
        },
        adjustedPosition() {
            // for zoom > 100%, the y-position of the menu has to be adjusted for the growing add-port-button
            let verticalShift = this.zoomFactor > 1
                ? this.$shapes.portSize / 2 * Math.log(this.zoomFactor) / 1.2 // eslint-disable-line no-magic-numbers
                : 0;

            return {
                y: this.position.y + verticalShift,
                x: this.position.x
            };
        },
        suggestedSearchResults() {
            return this.suggestedPortTypes.map(typeId => ({
                typeId,
                name: this.availablePortTypes[typeId].name
            }));
        },
        searchResults() {
            if (this.searchValue === '') {
                return this.suggestedSearchResults;
            } else {
                return this.portTypeSearch.search(this.searchValue, { limit: this.suggestedPortTypes.length })
                    .map(result => result.item);
            }
        },
        menuItems() {
            return this.searchResults.map(({ typeId, name }) => ({
                port: { typeId },
                text: name,
                icon: portIcon({ typeId })
            }));
        }
    },
    mounted() {
        this.$refs.searchBar.focus();
    },
    methods: {
        onMenuItemClick(e, item) {
            this.$emit('item-click', item);
            this.$emit('menu-close', item);
        },
        onSearchBarDown() {
            this.$refs.searchResults.focusFirst();
        },
        onSearchBarUp() {
            this.$refs.searchResults.focusLast();
        },
        onSearchResultsWrapAround(e) {
            e.preventDefault();
            this.$refs.searchBar.focus();
        }
    }
};
</script>

<template>
  <FloatingMenu
    ref="floatingMenu"
    :anchor="side === 'input' ? 'top-right' : 'top-left'"
    :canvas-position="adjustedPosition"
    @menu-close="$emit('menu-close')"
  >
    <div
      :class="['header', side]"
      :style="{
        '--margin': headerMargin
      }"
    >
      Add {{ side === 'input' ? 'Input' : 'Output' }} Port
    </div>
    <div
      class="search"
    >
      <SearchBar
        ref="searchBar"
        v-model="searchValue"
        placeholder="Search port type"
        class="search-bar"
        @keydown.down.exact.native="onSearchBarDown"
        @keydown.up.exact.native="onSearchBarUp"
      />
      <MenuItems
        v-if="searchResults.length"
        ref="searchResults"
        :items="menuItems"
        class="search-results"
        aria-label="Port Type Menu"
        @item-click="onMenuItemClick"
        @item-active="$emit('item-active', $event)"
        @top-reached="onSearchResultsWrapAround"
        @bottom-reached="onSearchResultsWrapAround"
      />
      <div
        v-else
        class="placeholder"
      >
        No port matching
      </div>
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>

.header {
  font-family: "Roboto Condensed", sans-serif;
  font-weight: 500;
  font-size: 14px;
  margin-top: -7px;
  backdrop-filter: blur(2px);
  pointer-events: none;

  &.input {
    text-align: right;
    margin-right: var(--margin);
  }

  &.output {
    text-align: left;
    margin-left: var(--margin);
  }
}

.search {
  border: 1px solid var(--knime-masala);
  background-color: white;
  box-shadow: 0 1px 4px 0 var(--knime-gray-dark-semi);
}

.placeholder {
  font-style: italic;
  text-align: center;
  padding: 6px 6px;
  font-size: 14px;
}

.search-bar {
  font-size: 14px;
  border: none;
  border-bottom: 1px solid var(--knime-stone-gray);

  & >>> .lens-icon {
    --icon-size: 14;

    margin-left: 0;
    padding: 6px;

    & svg {
      stroke: var(--knime-black);
    }
  }

  & >>> .clear-search {
    --icon-size: 12;

    padding: 3px;
    margin: 3px;
    margin-right: 5px;
  }
}

.search-results {
  margin: 0;

  & >>> .label {
    font-size: 14px;
  }

  & >>> svg { /* stylelint-disable-line no-descending-specificity */
    height: 14px !important;
    width: 14px !important;
  }

  & >>> svg * {
    pointer-events: none !important;
  }


  & >>> li button {
    padding: 6px 6px;
  }

  & >>> li .item-icon {
    margin-right: 9px;
  }
}
</style>
