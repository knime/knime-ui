<script lang="ts">
import { defineComponent, type PropType } from "vue";
import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import CircleHelp from "webapps-common/ui/assets/img/icons/circle-help.svg";
import type { NodeRepositoryDisplayModesType } from "@/store/settings";

/**
 * Basic NodeTemplate without any drag or insert features. This component should stay reusable.
 */
export default defineComponent({
  components: {
    NodePreview,
    FunctionButton,
    CircleHelp,
  },
  expose: ["getNodePreview"],
  props: {
    /**
     * Additional to the properties of the NodeTemplate from the gateway API, this object
     * contains the port information (color and kind) which was mapped from the store
     */
    nodeTemplate: {
      type: Object,
      default: null,
    },
    displayMode: {
      type: String as PropType<NodeRepositoryDisplayModesType>,
      default: "icon",
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
    isHighlighted: {
      type: Boolean,
      default: false,
    },
    showFloatingHelpIcon: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["helpIconClick"],
  data() {
    return {
      nodeHovered: false,
    };
  },
  methods: {
    getNodePreview() {
      return this.$refs.nodePreview;
    },

    onPointerEnter() {
      this.nodeHovered = true;
    },

    onPointerLeave() {
      this.nodeHovered = false;
    },
  },
});
</script>

<template>
  <div
    class="node"
    :class="{
      selected: isSelected && !showFloatingHelpIcon,
      highlighted: isHighlighted,
      grabbable: showFloatingHelpIcon,
      'display-icons': displayMode === 'icon',
      'display-list': displayMode === 'list',
    }"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <FunctionButton
      v-if="showFloatingHelpIcon"
      :class="[
        'description-icon',
        { 'selected-icon': isSelected, 'hovered-icon': nodeHovered },
      ]"
      @click="$emit('helpIconClick')"
      @dblclick.stop
    >
      <CircleHelp class="info-icon" />
    </FunctionButton>
    <span :title="nodeTemplate.name">{{ nodeTemplate.name }}</span>
    <NodePreview
      ref="nodePreview"
      class="node-preview"
      :type="nodeTemplate.type"
      :in-ports="nodeTemplate.inPorts"
      :out-ports="nodeTemplate.outPorts"
      :icon="nodeTemplate.icon"
    />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node {
  margin: 0 2px;
  position: relative;
  display: flex;
  font-size: 12px;

  & .description-icon {
    padding: 0;
    display: none;

    & .info-icon {
      @mixin svg-icon-size 16;
    }

    &.hovered-icon {
      display: flex;

      & .info-icon {
        fill: var(--knime-white);
        stroke: var(--knime-masala);
      }
    }

    &.selected-icon {
      display: flex;

      & .info-icon {
        fill: var(--knime-masala);
        stroke: var(--knime-white);
      }
    }

    &.hovered-icon .info-icon:hover {
      fill: var(--knime-masala);
      stroke: var(--knime-white);
    }
  }

  &.display-list {
    background-color: var(--knime-white);
    flex-direction: row-reverse;
    align-items: center;
    justify-content: left;

    & .node-preview {
      width: 25px;
    }

    & span {
      flex-grow: 2;
      margin-left: 5px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    & .description-icon {
      position: absolute;
      right: 5px;
    }
  }

  &.display-icons {
    height: 78px;
    padding-bottom: 47px;
    width: 100px;
    flex-direction: column-reverse;
    align-items: center;
    text-align: center;
    font-weight: 700;

    & span {
      max-height: 26px;
      max-width: 90px;
      /* stylelint-disable-next-line value-no-vendor-prefix */
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }

    & .node-preview {
      padding-bottom: 6px;
      width: 70px;
      position: absolute;
      bottom: -15px;
      right: 15px;
    }

    & .description-icon {
      position: absolute;
      top: 2px;
      right: -2px;

      &.hovered-icon {
        align-items: center;
        justify-content: center;
      }

      &.selected-icon {
        align-items: center;
        justify-content: center;
      }
    }
  }

  &:hover {
    cursor: pointer;
  }

  &.grabbable:hover {
    cursor: grab;
  }
}

.highlighted {
  outline: calc(v-bind("$shapes.selectedNodeStrokeWidth") * 1px) solid
    var(--knime-dove-gray);
  border-radius: calc(v-bind("$shapes.selectedItemBorderRadius") * 1px);
  background-color: var(--knime-porcelain);
}

/* selected needs to come after highlighted */
.selected {
  outline: calc(v-bind("$shapes.selectedNodeStrokeWidth") * 1px) solid
    v-bind("$colors.selection.activeBorder");
  border-radius: calc(v-bind("$shapes.selectedItemBorderRadius") * 1px);
  background-color: v-bind("$colors.selection.activeBackground");
}
</style>
