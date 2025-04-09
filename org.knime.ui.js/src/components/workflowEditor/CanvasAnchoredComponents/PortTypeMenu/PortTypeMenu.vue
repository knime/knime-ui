<script setup lang="ts">
import { computed, ref, toRef, useTemplateRef, watch } from "vue";
import { storeToRefs } from "pinia";

import { MenuItems, SearchInput } from "@knime/components";
import ReturnIcon from "@knime/styles/img/icons/arrow-back.svg";

import type { NodePortGroups } from "@/api/custom-types";
import type { XY } from "@/api/gateway-api/generated-api";
import portIcon from "@/components/common/PortIconRenderer";
import { useApplicationStore } from "@/store/application/application";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import type { PortTypeMenuState } from "@/store/canvasAnchoredComponents/canvasAnchoredComponents";
import * as $shapes from "@/style/shapes";
import { makeTypeSearch } from "@/util/fuzzyPortTypeSearch";
import { getFloatingMenuComponent } from "../getFloatingMenuComponent";

import type { MenuItemWithPort } from "./types";

const { FloatingMenu } = getFloatingMenuComponent();

const isPortGroupWithSinglePort = (
  portGroups: NodePortGroups,
  groupName: string,
) => portGroups[groupName]?.supportedPortTypeIds?.length === 1;

const portNameSizeThreshold = 20;

type Props = PortTypeMenuState["props"];

const props = withDefaults(defineProps<Props>(), {
  portGroups: null,
});

type Events = Required<PortTypeMenuState["events"]>;

const $emit = defineEmits<{
  itemActive: Parameters<Events["itemActive"]>;
  itemClick: Parameters<Events["itemClick"]>;
  menuClose: Parameters<Events["menuClose"]>;
}>();

const searchQuery = ref("");
const selectedPortGroup = ref<string | null>(null);
// eslint-disable-next-line no-undefined
const ariaActiveDescendant = ref<string | undefined>(undefined);

const { zoomFactor } = storeToRefs(useSVGCanvasStore());
const { availablePortTypes, suggestedPortTypes } = storeToRefs(
  useApplicationStore(),
);

const headerMargin = computed(() => {
  // the x-position of the header text has to be adjusted for the growing/shrinking add-port-button
  const distanceToPort = $shapes.portSize * Math.pow(zoomFactor.value, 0.8); // eslint-disable-line no-magic-numbers
  return `${distanceToPort + 1}px`;
});

const headerText = computed(() => {
  if (props.portGroups && !selectedPortGroup.value) {
    return "Select port group";
  }

  return `Add ${props.side === "input" ? "Input" : "Output"} Port`;
});

const adjustedPosition = computed((): XY => {
  // for zoom > 100%, the y-position of the menu has to be adjusted for the growing add-port-button
  const verticalShift =
    zoomFactor.value > 1
      ? (($shapes.portSize / 2) * Math.log(zoomFactor.value)) / 1.2 // eslint-disable-line no-magic-numbers
      : 0;

  return {
    y: props.position.y + verticalShift,
    x: props.position.x,
  };
});

const portTypesInSelectedGroup = computed(() => {
  if (!props.portGroups || !selectedPortGroup.value) {
    return null;
  }

  return props.portGroups[selectedPortGroup.value].supportedPortTypeIds ?? [];
});

const searchPortsFunction = computed(() => {
  const searchTypeIds = portTypesInSelectedGroup.value
    ? portTypesInSelectedGroup.value
    : Object.keys(availablePortTypes.value);

  const suggestedTypeIds = portTypesInSelectedGroup.value
    ? suggestedPortTypes.value.filter((typeId) =>
        portTypesInSelectedGroup.value!.includes(typeId),
      )
    : suggestedPortTypes.value;

  return makeTypeSearch({
    typeIds: searchTypeIds,
    availablePortTypes: availablePortTypes.value,
    suggestedTypeIds,
  });
});

const searchResults = computed(() =>
  searchPortsFunction.value(searchQuery.value),
);

const sidePortGroups = computed(() => {
  if (props.portGroups) {
    return Object.entries(props.portGroups).filter(([_, group]) =>
      props.side === "input" ? group.canAddInPort : group.canAddOutPort,
    );
  }

  return null;
});

const menuItems = computed((): Array<MenuItemWithPort> => {
  if (props.portGroups && !selectedPortGroup.value) {
    return sidePortGroups.value!.map(([groupName]) => ({ text: groupName }));
  }

  return searchResults.value.map(({ typeId, name }) => ({
    port: { typeId },
    text: name,
    icon: portIcon({ typeId }) as any,
    title: name.length > portNameSizeThreshold ? name : null,
  }));
});

const shouldDisplaySearchBar = computed(() =>
  props.portGroups ? Boolean(selectedPortGroup.value) : true,
);

watch(
  toRef(props, "portGroups"),
  () => {
    // automatically select the first port group when there's only 1
    if (sidePortGroups.value?.length === 1) {
      const [groupName] = sidePortGroups.value[0];
      selectedPortGroup.value = groupName;
    }
  },
  { immediate: true },
);

//   methods: {
const emitPortClick = ({
  typeId,
  portGroup,
}: {
  typeId: string;
  portGroup: string | null;
}) => {
  $emit("itemClick", { typeId, portGroup });
  $emit("menuClose");
};

const onMenuItemClick = (_: MouseEvent, item: MenuItemWithPort) => {
  if (item.port) {
    const { typeId } = item.port;
    emitPortClick({ typeId, portGroup: selectedPortGroup.value });
  } else if (props.portGroups) {
    // when clicking on a port group
    // grab the first typeId of the matching group (group's name is the item.text property)
    // if there's only 1 type inside
    if (isPortGroupWithSinglePort(props.portGroups, item.text)) {
      const [typeId] = props.portGroups[item.text].supportedPortTypeIds ?? [];

      emitPortClick({ typeId, portGroup: item.text });
      return;
    }

    selectedPortGroup.value = item.text;
  }
};

const searchResultsRef = useTemplateRef("searchResultsRef");
const onSearchBarKeyDown = (event: KeyboardEvent) => {
  if (searchResultsRef.value) {
    searchResultsRef.value.onKeydown(event);
  }
};

const setActiveDescendant = (
  id: string | null,
  item: MenuItemWithPort | null,
) => {
  ariaActiveDescendant.value =
    id === null
      ? // eslint-disable-next-line no-undefined
        undefined // needs to be `undefined` to get accepted corrected for tha aria attribute
      : id;

  $emit("itemActive", item);
};
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
        ref="searchResultsRef"
        :items="menuItems"
        class="search-results"
        menu-aria-label="Port Type Menu"
        disable-space-to-click
        @close="$emit('menuClose')"
        @item-click="onMenuItemClick"
        @item-hovered="$emit('itemActive', $event as MenuItemWithPort)"
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
