<script setup lang="ts">
import { ref } from "vue";
import Draggable from "vuedraggable";

import { useComponentLayoutEditor } from "@/composables/useComponentLayoutEditor";

const { getAvailableNodes, elements, setDragging } = useComponentLayoutEditor();

const availableNodes = ref(getAvailableNodes());

const handleDragStart = () => {
  setDragging(true);
};

const handleDragEnd = () => {
  setDragging(false);
};

const handleCloneNode = () => {
  console.log("handleCloneNode");
};

const handleMoveNode = () => {
  console.log("handleMoveNode");
};

const handleNodeClick = (node: unknown) => {
  console.log("handleNodeClick", node);
};

const handleCloneElement = () => {
  console.log("handleCloneElement");
};

const handleElementClick = (element: unknown) => {
  console.log("handleElementClick", element);
};
</script>

<template>
  <h4>Views <small class="text-muted">drag into layout or click</small></h4>
  <Draggable
    v-model:list="availableNodes"
    :options="{
      group: { name: 'content', pull: 'clone', put: false },
      sort: false,
      draggable: '.item',
    }"
    :clone="handleCloneNode"
    :move="handleMoveNode"
    element="ul"
    class="available-nodes"
    item-key="id"
    @start="handleDragStart"
    @end="handleDragEnd"
  >
    <template #item="{ element, index }">
      <li
        :key="index"
        :class="['item', element.type]"
        @click.prevent="handleNodeClick(element)"
      >
        <div class="name">
          <img :src="element.icon" />
          <div :title="element.name">
            {{ element.name }}
          </div>
          <small class="text-muted">Node {{ element.nodeID }}</small>
        </div>
        <div
          v-if="element.description && element.description.length"
          class="description"
          :title="element.description"
        >
          {{ element.description }}
        </div>
      </li>
    </template>
    <template #footer>
      <small v-if="availableNodes.length === 0">
        (all views are used in the layout)
      </small>
    </template>
  </Draggable>

  <h4>Rows <small class="text-muted">drag into layout or click</small></h4>
  <Draggable
    v-model:list="elements"
    :options="{
      group: { name: 'content', pull: 'clone', put: false },
      sort: false,
    }"
    :clone="handleCloneElement"
    element="ul"
    class="available-elements"
    item-key="name"
    @start="handleDragStart"
    @end="handleDragEnd"
  >
    <template #item="{ element, index }">
      <li
        :key="index"
        :title="element.name"
        class="item row"
        @click.prevent="handleElementClick(element)"
      >
        <div
          v-for="(_, colIndex) in element.data.columns"
          :key="colIndex"
          class="col"
        />
      </li>
    </template>
  </Draggable>
</template>

<style lang="postcss" scoped>
.text-muted {
  color: var(--knime-dove-gray);
}

.available-nodes {
  & .item {
    background-color: var(--knime-aquamarine);

    &.quickform,
    &.configuration {
      background-color: var(--knime-avocado);

      &:hover {
        background-color: var(--knime-avocado-light);
      }
    }

    & .name {
      display: flex;

      & div {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        margin-right: 8px;
      }

      & img {
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }

      & small {
        white-space: nowrap;
      }
    }

    & .description {
      margin-left: 20px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.available-elements {
  & .item {
    background-color: var(--knime-white);
  }

  & .row {
    border: 2px solid var(--knime-silver-sand);
    height: 30px;
    display: flex;
    align-items: center;
  }

  & .col {
    flex: 1;
    height: 70%;
  }

  & .col:not(:last-of-type) {
    border-right: 2px solid var(--knime-silver-sand);
  }
}

.available-nodes,
.available-elements {
  list-style: none;
  padding: 0;
  min-height: 30px;

  & .item {
    cursor: grab;
    border-radius: 3px;
    padding: 2px 5px;
    margin-bottom: 4px;

    &:hover {
      background-color: var(--knime-aquamarine-light);
    }
  }
}
</style>
