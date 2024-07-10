<script lang="ts" setup>
import { ref, watch, computed, toRef } from "vue";
import { useActiveElement } from "@vueuse/core";
import { Button, useKeyPressedUntilMouseClick } from "@knime/components";
import CircleArrowIcon from "@knime/styles/img/icons/circle-arrow-right.svg";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import NodeTemplate from "@/components/nodeRepository/NodeTemplate/NodeTemplate.vue";

const NODES_PER_ROW_ICON_MODE = 3;
const NODES_PER_ROW_LIST_MODE = 1;

interface Props {
  nodes: Array<NodeTemplateWithExtendedPorts>;
  hasMoreNodes?: boolean;
  displayMode?: NodeRepositoryDisplayModesType;
  selectedNode?: NodeTemplateWithExtendedPorts | null;
  showDescriptionForNode?: NodeTemplateWithExtendedPorts | null;
  highlightFirst?: boolean;
}

const navigationKeys = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
] as const;

export type NavigationKey = (typeof navigationKeys)[number];
export type NavReachedEvent = { key: NavigationKey; startIndex: number };

const props = withDefaults(defineProps<Props>(), {
  hasMoreNodes: false,
  displayMode: "icon",
  selectedNode: null,
  showDescriptionForNode: null,
  highlightFirst: false,
});

const emit = defineEmits<{
  enterKey: [node: NodeTemplateWithExtendedPorts];
  helpKey: [node: NodeTemplateWithExtendedPorts];
  showMore: [];
  "update:selectedNode": [node: NodeTemplateWithExtendedPorts | null];
  navReachedTop: [event: NavReachedEvent];
  navReachedEnd: [event: NavReachedEvent];
}>();

const root = ref<HTMLElement>();

const moreButton = ref<InstanceType<typeof Button>>();

const activeElement = useActiveElement();
const hasKeyboardFocus = useKeyPressedUntilMouseClick([
  "Tab",
  ...navigationKeys,
]);

const nodesPerRow = computed(() => {
  return props.displayMode === "icon"
    ? NODES_PER_ROW_ICON_MODE
    : NODES_PER_ROW_LIST_MODE;
});

const nodeTemplateProps = (
  node: NodeTemplateWithExtendedPorts,
  index: number,
) => {
  return {
    nodeTemplate: node,
    isHighlighted:
      props.selectedNode === null && index === 0 && props.highlightFirst,
    isSelected: props.selectedNode?.id === node.id,
    isDescriptionActive: props.showDescriptionForNode?.id === node.id,
    displayMode: props.displayMode,
  };
};

const focusItem = (focusNode: NodeTemplateWithExtendedPorts | undefined) => {
  // select the item if the current selection is not in our list
  if (
    focusNode &&
    !props.nodes.find((someNode) => someNode.id === props.selectedNode?.id)
  ) {
    emit("update:selectedNode", focusNode);
  }
};

const focusMoreButton = () => {
  moreButton.value?.$el.focus();
};

const navReachedFocusOffset = (navReached?: NavReachedEvent) => {
  // no offset for left/right
  if (!navReached) {
    return 0;
  }

  const { key, startIndex } = navReached;

  switch (key) {
    case "ArrowDown":
      return startIndex % nodesPerRow.value;
    case "ArrowUp":
      return nodesPerRow.value - 1 - startIndex;
  }

  return 0;
};

const focusLast = (navReached?: NavReachedEvent) => {
  const offset = navReachedFocusOffset(navReached);
  if (props.hasMoreNodes && offset === 0) {
    focusMoreButton();
    return;
  }

  const index = offset === 0 ? -1 : offset * -1;
  focusItem(props.nodes?.at(index));
};
const focusFirst = (navReached?: NavReachedEvent) => {
  const offset = navReachedFocusOffset(navReached);
  focusItem(props.nodes?.at(0 + offset));
};

const domFocusNode = (nodeIndex: number) => {
  const nodeListElement = root.value!.querySelector(
    `[data-index="${nodeIndex}"]`,
  ) as HTMLElement;
  nodeListElement?.focus();
};

const onKeyDown = (event: KeyboardEvent) => {
  const { key } = event;

  const isNavigationKey = (key: string): key is NavigationKey =>
    navigationKeys.includes(key as any);
  if (!isNavigationKey(key)) {
    return;
  }

  event.stopPropagation();
  event.preventDefault();

  // no navigation for empty nodes
  if (props.nodes.length < 1) {
    return;
  }

  // find active item index
  let activeItemIndex = props.nodes.findIndex(
    (node) => node.id === props.selectedNode?.id,
  );

  // special handling of show more nodes if we have that
  if (props.hasMoreNodes && activeElement.value === moreButton.value?.$el) {
    activeItemIndex = props.nodes.length;
  }

  const selectNextNode = (indexOffset: number) => {
    const nextIndex = activeItemIndex + indexOffset;

    // handle show more button as fake item
    if (props.hasMoreNodes && nextIndex === props.nodes.length) {
      focusMoreButton();
      return;
    }

    if (nextIndex >= props.nodes.length) {
      emit("navReachedEnd", { key, startIndex: activeItemIndex });
      return;
    }

    if (nextIndex < 0) {
      emit("navReachedTop", { key, startIndex: activeItemIndex });
      return;
    }

    const node = props.nodes[nextIndex];
    if (node) {
      emit("update:selectedNode", node);
    }
  };

  // items navigation
  switch (key) {
    case "ArrowUp":
      selectNextNode(nodesPerRow.value * -1);
      break;
    case "ArrowDown":
      selectNextNode(nodesPerRow.value);
      break;
    case "ArrowLeft":
      selectNextNode(-1);
      break;
    case "ArrowRight":
      selectNextNode(+1);
      break;
  }
};

watch(
  toRef(props, "selectedNode"),
  (newSelectedNode) => {
    if (!newSelectedNode || !props.nodes) {
      return;
    }
    const nodeIndex = props.nodes.findIndex(
      (node) => node.id === newSelectedNode?.id,
    );
    if (nodeIndex >= 0) {
      domFocusNode(nodeIndex);
    }
  },
  { immediate: false },
);

watch(activeElement, (el) => {
  // focus within (useFocusWithin does not work)
  const isFocused = el ? root.value?.contains(el) : false;
  const isShowMoreButtonFocused = el && moreButton.value?.$el === el;

  // deselect item if its in our list and we loose focus
  if (
    (!isFocused || isShowMoreButtonFocused) &&
    props.selectedNode &&
    props.nodes.find((node) => node.id === props.selectedNode!.id)
  ) {
    emit("update:selectedNode", null);
    return;
  }

  // select first item on focus if there is no selection
  if (
    hasKeyboardFocus.value &&
    isFocused &&
    !props.selectedNode &&
    props.nodes.length > 0
  ) {
    emit("update:selectedNode", props.nodes[0]);
  }
});

defineExpose({ focusFirst, focusLast });
</script>

<template>
  <div ref="root" class="nodes-container">
    <ul
      :class="['nodes', `display-${displayMode}`]"
      tabindex="0"
      @keydown="onKeyDown"
    >
      <li
        v-for="(node, index) in nodes"
        :key="node.id"
        tabindex="-1"
        :data-index="index"
        @keydown.enter.stop.prevent="$emit('enterKey', node)"
        @keydown.i.stop.prevent="$emit('helpKey', node)"
      >
        <slot name="item" v-bind="nodeTemplateProps(node, index)">
          <NodeTemplate v-bind="nodeTemplateProps(node, index)" />
        </slot>
      </li>
      <li>
        <Button
          v-if="hasMoreNodes"
          ref="moreButton"
          compact
          without-border
          class="show-more"
          @click="$emit('showMore')"
        >
          <slot name="more-button" /><br />
          <CircleArrowIcon class="icon" />
        </Button>
      </li>
    </ul>
  </div>
</template>

<style lang="postcss" scoped>
.nodes-container {
  margin-bottom: 13px;

  & .nodes {
    display: grid;
    position: relative;
    grid-template-columns: repeat(v-bind(nodesPerRow), 1fr);
    width: 100%;
    font-family: "Roboto Condensed", sans-serif;
    margin: 5px 0 0;

    /* reset default ul styles */
    padding: 0;
    list-style-type: none;

    &:focus {
      outline: none;
    }

    & .show-more {
      color: var(--knime-masala);
      font-weight: 400;

      &:focus-visible {
        outline: calc(v-bind("$shapes.selectedNodeStrokeWidth") * 1px) solid
          v-bind("$colors.selection.activeBorder");
        border-radius: calc(v-bind("$shapes.selectedItemBorderRadius") * 1px);
        background-color: v-bind("$colors.selection.activeBackground");
      }
    }

    & li {
      &:focus {
        outline: none;
      }
    }

    &.display-list {
      flex-grow: 1;

      & .show-more {
        display: flex;
        flex-direction: row-reverse;
        align-items: center;
        width: calc(100% - 4px);
        justify-content: center;
        border-radius: 0;
        height: 27px;
        padding: 4px;
        margin: 1px 2px;

        & .icon {
          margin: 0 5px 0 0;
        }
      }

      & li {
        /* fixes the scrolling to top selected border cut off problem */
        padding: 1px 0;
      }
    }

    &.display-icon {
      gap: 4px 0;

      & .show-more {
        display: flex;
        margin: 0 2px;
        width: calc(100% - 4px);
        height: 100%;
        flex-direction: column;
        justify-content: center;
        align-items: center;

        & .icon {
          margin: 0;
        }
      }

      & li {
        /* fixes the scrolling to top selected border cut off problem */
        padding: 3px 0;
      }
    }
  }
}
</style>
