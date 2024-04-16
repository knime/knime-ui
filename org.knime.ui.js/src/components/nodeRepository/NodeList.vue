<script lang="ts" setup>
import Button from "webapps-common/ui/components/Button.vue";
import CircleArrowIcon from "webapps-common/ui/assets/img/icons/circle-arrow-right.svg";
import NodeTemplate from "@/components/nodeRepository/NodeTemplate/NodeTemplate.vue";
import { ref, watch, computed, toRef } from "vue";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";
import type { NodeTemplateWithExtendedPorts } from "@/api/custom-types";
import { useActiveElement } from "@vueuse/core";
import useKeyboardFocus from "@/composables/useKeyboardFocus";

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

interface Emits {
  (e: "enterKey", node: NodeTemplateWithExtendedPorts): void;
  (e: "helpKey", node: NodeTemplateWithExtendedPorts): void;
  (e: "showMore"): void;
  (e: "update:selectedNode", node: NodeTemplateWithExtendedPorts | null): void;
  (e: "navReachedTop"): void;
  (e: "navReachedEnd"): void;
}

const props = withDefaults(defineProps<Props>(), {
  hasMoreNodes: false,
  displayMode: "icon",
  selectedNode: null,
  showDescriptionForNode: null,
  highlightFirst: false,
});

const emit = defineEmits<Emits>();

const root = ref<HTMLElement>();

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

const focusLast = () => {
  focusItem(props.nodes?.at(-1));
};
const focusFirst = () => {
  focusItem(props.nodes?.at(0));
};

const domFocusNode = (nodeIndex: number) => {
  const nodeListElement = root.value!.querySelector(
    `[data-index="${nodeIndex}"]`,
  ) as HTMLElement;
  nodeListElement?.focus();
};

const onKeyDown = (key: string) => {
  // no navigation for empty nodes
  if (props.nodes.length < 1) {
    return;
  }

  const activeItemIndex = props.nodes.findIndex(
    (node) => node.id === props.selectedNode?.id,
  );

  const selectNextNode = (indexOffset: number) => {
    const nextIndex = activeItemIndex + indexOffset;

    if (nextIndex >= props.nodes.length && key === "down") {
      emit("navReachedEnd");
      return;
    }

    if (nextIndex < 0 && key === "up") {
      emit("navReachedTop");
      return;
    }

    const node = props.nodes[nextIndex];
    if (node) {
      emit("update:selectedNode", node);
    }
  };

  // items navigation
  if (key === "up") {
    selectNextNode(nodesPerRow.value * -1);
    return;
  }

  if (key === "down") {
    selectNextNode(nodesPerRow.value);
    return;
  }

  if (key === "left") {
    selectNextNode(-1);
    return;
  }

  if (key === "right") {
    selectNextNode(+1);
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

const activeElement = useActiveElement();
const hasKeyboardFocus = useKeyboardFocus([
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

watch(activeElement, (el) => {
  // focus within (useFocusWithin does not work)
  const focused = el ? root.value?.contains(el) : false;

  // deselect item if its in our list and we loose focus
  if (
    !focused &&
    props.selectedNode &&
    props.nodes.find((node) => node.id === props.selectedNode!.id)
  ) {
    emit("update:selectedNode", null);
    return;
  }

  // select first item on focus if there is no selection
  if (
    hasKeyboardFocus.value &&
    focused &&
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
      @keydown.left.stop="onKeyDown('left')"
      @keydown.up.stop.prevent="onKeyDown('up')"
      @keydown.down.stop.prevent="onKeyDown('down')"
      @keydown.right.stop="onKeyDown('right')"
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
@import url("@/assets/mixins.css");

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
    }

    & li {
      &:focus {
        outline: none;
      }
    }

    &.display-list {
      flex-grow: 1;

      & .show-more {
        margin: 0;
        display: flex;
        flex-direction: row-reverse;
        align-items: center;
        border-radius: 0;
        width: 100%;
        justify-content: center;

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
        margin: 20px auto 0;
        display: block;

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
