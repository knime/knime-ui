<script lang="ts">
import { type PropType, defineComponent } from "vue";
import { mapState } from "pinia";

import { MenuItems, SearchInput } from "@knime/components";
import ReturnIcon from "@knime/styles/img/icons/arrow-back.svg";

import type { NodePortGroups } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import FloatingMenu from "@/components/common/FloatingMenu.vue";
import portIcon from "@/components/common/PortIconRenderer";
import { useApplicationStore } from "@/store/application/application";
import { useCanvasStore } from "@/store/canvas";
import { makeTypeSearch } from "@/util/fuzzyPortTypeSearch";

import type { MenuItemWithPort } from "./types";

const isPortGroupWithSinglePort = (
  portGroups: NodePortGroups,
  groupName: string,
) => portGroups[groupName]?.supportedPortTypeIds?.length === 1;

const portNameSizeThreshold = 20;

type ComponentData = {
  searchQuery: string;
  selectedPortGroup: string | null;
  ariaActiveDescendant: string | undefined;
};

export default defineComponent({
  components: {
    FloatingMenu,
    MenuItems,
    SearchInput,
    ReturnIcon,
  },
  props: {
    /**
     * Absolute position of the menu. It's relative to the next absolute/relative positioned parent.
     */
    position: {
      type: Object as PropType<XY>,
      required: true,
      validator: (position: XY) =>
        typeof position.x === "number" && typeof position.y === "number",
    },
    side: {
      type: String as PropType<"input" | "output">,
      required: true,
      validator: (side: "input" | "output") =>
        ["input", "output"].includes(side),
    },
    portGroups: {
      type: Object as PropType<NodePortGroups | null>,
      default: null,
    },
  },

  emits: ["itemClick", "itemActive", "menuClose"],

  data: (): ComponentData => ({
    searchQuery: "",
    selectedPortGroup: null,
    // eslint-disable-next-line no-undefined
    ariaActiveDescendant: undefined,
  }),

  computed: {
    ...mapState(useCanvasStore, ["zoomFactor"]),
    ...mapState(useApplicationStore, [
      "availablePortTypes",
      "suggestedPortTypes",
    ]),

    headerMargin() {
      // the x-position of the header text has to be adjusted for the growing/shrinking add-port-button
      const distanceToPort =
        this.$shapes.portSize * Math.pow(this.zoomFactor, 0.8); // eslint-disable-line no-magic-numbers
      return `${distanceToPort + 1}px`;
    },

    headerText() {
      if (this.portGroups && !this.selectedPortGroup) {
        return "Select port group";
      }

      return `Add ${this.side === "input" ? "Input" : "Output"} Port`;
    },

    adjustedPosition(): XY {
      // for zoom > 100%, the y-position of the menu has to be adjusted for the growing add-port-button
      const verticalShift =
        this.zoomFactor > 1
          ? ((this.$shapes.portSize / 2) * Math.log(this.zoomFactor)) / 1.2 // eslint-disable-line no-magic-numbers
          : 0;

      return {
        y: this.position.y + verticalShift,
        x: this.position.x,
      };
    },

    searchPortsFunction() {
      const searchTypeIds = this.portTypesInSelectedGroup
        ? this.portTypesInSelectedGroup
        : Object.keys(this.availablePortTypes);

      const suggestedPortTypes: string[] = this.suggestedPortTypes;

      const suggestedTypeIds = this.portTypesInSelectedGroup
        ? suggestedPortTypes.filter((typeId) =>
            this.portTypesInSelectedGroup!.includes(typeId),
          )
        : suggestedPortTypes;

      return makeTypeSearch({
        typeIds: searchTypeIds,
        availablePortTypes: this.availablePortTypes,
        suggestedTypeIds,
      });
    },

    searchResults() {
      return this.searchPortsFunction(this.searchQuery);
    },

    sidePortGroups() {
      if (this.portGroups) {
        return (
          Object.entries(this.portGroups)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .filter(([_, group]) =>
              this.side === "input" ? group.canAddInPort : group.canAddOutPort,
            )
        );
      }

      return null;
    },

    menuItems(): Array<MenuItemWithPort> {
      if (this.portGroups && !this.selectedPortGroup) {
        return this.sidePortGroups!.map(([groupName]) => ({ text: groupName }));
      }

      return this.searchResults.map(({ typeId, name }) => ({
        port: { typeId },
        text: name,
        icon: portIcon({ typeId }) as any,
        title: name.length > portNameSizeThreshold ? name : null,
      }));
    },

    portTypesInSelectedGroup() {
      if (!this.portGroups || !this.selectedPortGroup) {
        return null;
      }

      return this.portGroups[this.selectedPortGroup].supportedPortTypeIds ?? [];
    },

    shouldDisplaySearchBar() {
      return this.portGroups ? Boolean(this.selectedPortGroup) : true;
    },
  },
  watch: {
    portGroups: {
      immediate: true,
      handler() {
        // automatically select the first port group when there's only 1
        if (this.sidePortGroups?.length === 1) {
          const [groupName] = this.sidePortGroups[0];
          this.selectedPortGroup = groupName;
        }
      },
    },
  },
  methods: {
    emitPortClick({
      typeId,
      portGroup,
    }: {
      typeId: string;
      portGroup: string | null;
    }) {
      this.$emit("itemClick", { typeId, portGroup });
      this.$emit("menuClose");
    },

    onMenuItemClick(_: MouseEvent, item: MenuItemWithPort) {
      if (item.port) {
        const { typeId } = item.port;
        this.emitPortClick({ typeId, portGroup: this.selectedPortGroup });
      } else if (this.portGroups) {
        // when clicking on a port group
        // grab the first typeId of the matching group (group's name is the item.text property)
        // if there's only 1 type inside
        if (isPortGroupWithSinglePort(this.portGroups, item.text)) {
          const [typeId] =
            this.portGroups[item.text].supportedPortTypeIds ?? [];

          this.emitPortClick({ typeId, portGroup: item.text });
          return;
        }

        this.selectedPortGroup = item.text;
      }
    },

    onSearchBarKeyDown(event: KeyboardEvent) {
      const searchResults = this.$refs.searchResults as InstanceType<
        typeof MenuItems
      >;
      if (searchResults) {
        searchResults.onKeydown(event);
      }
    },

    setActiveDescendant(id: string | null, item: MenuItemWithPort | null) {
      this.ariaActiveDescendant =
        id === null
          ? // eslint-disable-next-line no-undefined
            undefined // needs to be `undefined` to get accepted corrected for tha aria attribute
          : id;

      this.$emit("itemActive", item);
    },
  },
});
</script>

<template>
  <FloatingMenu
    ref="floatingMenu"
    :anchor="side === 'input' ? 'top-right' : 'top-left'"
    :canvas-position="adjustedPosition"
    @menu-close="$emit('menuClose')"
  >
    <div :class="['header', side]" :style="{ '--margin': headerMargin }">
      {{ headerText }}
    </div>

    <div
      v-if="selectedPortGroup && Object.keys(sidePortGroups ?? {}).length > 1"
      class="return-button"
      @click="selectedPortGroup = null"
    >
      <ReturnIcon />
    </div>

    <div class="search">
      <SearchInput
        v-if="shouldDisplaySearchBar"
        v-model="searchQuery"
        placeholder="Search port type"
        class="search-bar"
        focus-on-mount
        :aria-owns="ariaActiveDescendant"
        :aria-activedescendant="ariaActiveDescendant"
        @keydown="onSearchBarKeyDown"
        @keydown.esc="$emit('menuClose')"
      />

      <MenuItems
        v-if="searchResults.length"
        ref="searchResults"
        :items="menuItems"
        class="search-results"
        menu-aria-label="Port Type Menu"
        disable-space-to-click
        @close="$emit('menuClose')"
        @item-click="onMenuItemClick"
        @item-hovered="$emit('itemActive', $event)"
        @item-focused="setActiveDescendant"
      />
      <div v-else class="placeholder">No port matching</div>
    </div>
  </FloatingMenu>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

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
  box-shadow: var(--shadow-elevation-1);

  &:hover {
    cursor: pointer;
    outline: none;
    background-color: var(--theme-dropdown-background-color-hover);
  }

  & svg {
    stroke: var(--knime-masala);

    @mixin svg-icon-size 14;
  }
}

.search {
  background-color: white;
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
  border-bottom: 1px solid var(--knime-silver-sand);
  box-shadow: var(--shadow-elevation-1);

  & :deep(.lens-icon) {
    --icon-size: 14;

    margin-left: 0;
    padding: 6px;

    & svg {
      stroke: var(--knime-black);
    }
  }

  & :deep(.clear-search) {
    --icon-size: 12;

    padding: 3px;
    margin: 3px;
    margin-right: 5px;
  }
}

.search-results {
  margin: 0;
  max-height: 160px;
  overflow: hidden auto;

  & :deep(.label) {
    font-size: 13px;
    max-width: 160px;

    & .text {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      font-weight: 400;
    }
  }

  & :deep(svg) {
    /* stylelint-disable-line no-descending-specificity */
    height: 11px !important;
    width: 11px !important;
    margin-top: 2px;
  }

  & :deep(svg *) {
    pointer-events: none !important;
  }

  & :deep(li button) {
    padding: 6px 6px 6px 9px;
  }

  & :deep(li .item-icon) {
    margin-right: 9px;
  }
}
</style>
