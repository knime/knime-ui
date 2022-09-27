<script>
import { mapState } from 'vuex';
import MenuItems from 'webapps-common/ui/components/MenuItems.vue';
import ReturnIcon from 'webapps-common/ui/assets/img/icons/arrow-back.svg';

import { makeTypeSearch } from '@/util/fuzzyPortTypeSearch';
import FloatingMenu from '@/components/common/FloatingMenu.vue';
import portIcon from '@/components/common/PortIconRenderer';
import SearchBar from '@/components/common/SearchBar.vue';

const isPortGroupWithSinglePort = (portGroups, groupName) => portGroups[groupName].supportedPortTypeIds.length === 1;
const portNameSizeThreshold = 20;

/**
 * ContextMenu offers actions for the Kanvas based on the selected nodes.
 */

export default {
    components: {
        FloatingMenu,
        MenuItems,
        SearchBar,
        ReturnIcon
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
        },
        portGroups: {
            type: Object,
            default: null
        }
    },
    data: () => ({
        searchQuery: '',
        selectedPortGroup: null
    }),
    computed: {
        ...mapState('canvas', ['zoomFactor']),
        ...mapState('application', ['availablePortTypes', 'suggestedPortTypes']),

        headerMargin() {
            // the x-position of the header text has to be adjusted for the growing/shrinking add-port-button
            const distanceToPort = this.$shapes.portSize * Math.pow(this.zoomFactor, 0.8); // eslint-disable-line no-magic-numbers
            return `${distanceToPort + 1}px`;
        },

        headerText() {
            if (this.portGroups && !this.selectedPortGroup) {
                return 'Select port group';
            }

            return `Add ${this.side === 'input' ? 'Input' : 'Output'} Port`;
        },
        
        adjustedPosition() {
            // for zoom > 100%, the y-position of the menu has to be adjusted for the growing add-port-button
            const verticalShift = this.zoomFactor > 1
                ? this.$shapes.portSize / 2 * Math.log(this.zoomFactor) / 1.2 // eslint-disable-line no-magic-numbers
                : 0;

            return {
                y: this.position.y + verticalShift,
                x: this.position.x
            };
        },

        searchPortsFunction() {
            const searchTypeIds = this.portTypesInSelectedGroup
                ? this.portTypesInSelectedGroup
                : Object.keys(this.availablePortTypes);
            
            const suggestedTypeIds = this.portTypesInSelectedGroup
                ? this.suggestedPortTypes.filter(typeId => this.portTypesInSelectedGroup.includes(typeId))
                : this.suggestedPortTypes;

            return makeTypeSearch({
                typeIds: searchTypeIds,
                availablePortTypes: this.availablePortTypes,
                suggestedTypeIds
            });
        },

        searchResults() {
            return this.searchPortsFunction(this.searchQuery);
        },
        
        menuItems() {
            if (this.portGroups && !this.selectedPortGroup) {
                return Object.entries(this.portGroups)
                    .filter(([_, group]) => this.side === 'input' ? group.canAddInPort : group.canAddOutPort)
                    .map(([groupName]) => ({ text: groupName }));
            }

            const menuItems = this.searchResults.map(({ typeId, name }) => ({
                port: { typeId },
                text: name,
                icon: portIcon({ typeId }),
                title: name.length > portNameSizeThreshold ? name : null
            }));

            return menuItems;
        },

        portTypesInSelectedGroup() {
            if (!this.portGroups || !this.selectedPortGroup) {
                return null;
            }

            return this.portGroups[this.selectedPortGroup].supportedPortTypeIds;
        },

        shouldDisplaySearchBar() {
            return this.portGroups ? Boolean(this.selectedPortGroup) : true;
        }
    },
    watch: {
        portGroups: {
            immediate: true,
            handler() {
                const portGroupsNames = Object.keys(this.portGroups || {});
                // automatically select the first port group when there's only 1
                if (portGroupsNames.length === 1) {
                    this.selectedPortGroup = portGroupsNames[0];
                }
            }
        }
    },
    mounted() {
        this.$refs.searchBar?.focus();
    },
    methods: {
        emitPortClick({ typeId, portGroup }) {
            this.$emit('item-click', { typeId, portGroup });
            this.$emit('menu-close', { typeId, portGroup });
        },

        onMenuItemClick(e, item) {
            if (item.port) {
                const { typeId } = item.port;
                this.emitPortClick({ typeId, portGroup: this.selectedPortGroup });
            } else {
                // when clicking on a port group
                // grab the first typeId of the matching group (group's name is the item.text property)
                // if there's only 1 type inside
                if (isPortGroupWithSinglePort(this.portGroups, item.text)) {
                    const [typeId] = this.portGroups[item.text].supportedPortTypeIds;
                    this.emitPortClick({ typeId, portGroup: item.text });
                    return;
                }
            
                this.selectedPortGroup = item.text;
            }
        },
        
        onSearchBarDown() {
            this.$refs.searchResults.focusFirst();
        },

        onSearchBarUp() {
            this.$refs.searchResults.focusLast();
        },
        
        onSearchResultsWrapAround(e) {
            e.preventDefault();
            this.$refs.searchBar?.focus();
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
      :style="{ '--margin': headerMargin }"
    >
      {{ headerText }}
    </div>

    <div
      v-if="selectedPortGroup && Object.keys(portGroups).length > 1"
      class="return-button"
      @click="selectedPortGroup = null"
    >
      <ReturnIcon />
    </div>

    <div class="search">
      <SearchBar
        v-if="shouldDisplaySearchBar"
        ref="searchBar"
        v-model="searchQuery"
        placeholder="Search port type"
        class="search-bar"
        @keydown.down.exact.native="onSearchBarDown"
        @keydown.up.exact.native="onSearchBarUp"
      />

      <div class="scroll-container">
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
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
.header {
  font-size: 13px;
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

.return-button {
  display: flex;
  padding: 6px;
  border: 1px solid var(--knime-masala);
  border-bottom: 0;
  background-color: white;
  box-shadow: 0 1px 4px 0 var(--knime-gray-dark-semi);
  --icon-size: 14;

  &:hover {
    cursor: pointer;
    outline: none;
    background-color: var(--theme-dropdown-background-color-hover);
  }

  & svg {
    stroke: var(--knime-masala);
    width: calc(var(--icon-size) * 1px);
    height: calc(var(--icon-size) * 1px);
    stroke-width: calc(32px / var(--icon-size));
  }
}

.search {
  border: 1px solid var(--knime-masala);
  background-color: white;
  box-shadow: 0 1px 4px 0 var(--knime-gray-dark-semi);
}

.scroll-container {
  overflow-y: scroll;
  overflow-x: hidden;
  text-align: left;
  height: 100%;
  max-height: 160px;
}

.placeholder {
  font-style: italic;
  text-align: center;
  padding: 6px;
  font-size: 13px;
}

.search-bar {
  font-size: 13px;
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
    font-size: 13px;
    max-width: 160px;

    & .text {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      font-weight: 400;
    }
  }

  & >>> svg { /* stylelint-disable-line no-descending-specificity */
    height: 11px !important;
    width: 11px !important;
    margin-top: 2px;
  }

  & >>> svg * {
    pointer-events: none !important;
  }

  & >>> li button {
    padding: 6px;
  }

  & >>> li .item-icon {
    margin-right: 9px;
  }
}
</style>
