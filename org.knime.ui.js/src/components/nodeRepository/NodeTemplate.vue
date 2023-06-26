<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";
import NodePreview from "webapps-common/ui/components/node/NodePreview.vue";
import FunctionButton from "webapps-common/ui/components/FunctionButton.vue";
import CircleHelp from "webapps-common/ui/assets/img/icons/circle-help.svg";

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
    isSelected: {
      type: Boolean,
      default: false,
    },
    isHighlighted: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      itemHovered: false,
    };
  },
  computed: {
    ...mapState("nodeRepository", ["isDescriptionPanelOpen"]),
  },
  methods: {
    getNodePreview() {
      return this.$refs.nodePreview;
    },

    onClick() {
      if (!this.isSelected || !this.isDescriptionPanelOpen) {
        this.$store.dispatch("nodeRepository/openDescriptionPanel");
        this.$store.commit("nodeRepository/setSelectedNode", this.nodeTemplate);
        return;
      }

      this.$store.dispatch("nodeRepository/closeDescriptionPanel");
    },

    onPointerEnter() {
      this.itemHovered = true;
    },

    onPointerLeave() {
      this.itemHovered = false;
    },
  },
});
</script>

<template>
  <div
    class="node"
    :class="{ selected: isSelected, highlighted: isHighlighted }"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <label :title="nodeTemplate.name">{{ nodeTemplate.name }}</label>
    <NodePreview
      ref="nodePreview"
      class="node-preview"
      :type="nodeTemplate.type"
      :in-ports="nodeTemplate.inPorts"
      :out-ports="nodeTemplate.outPorts"
      :icon="nodeTemplate.icon"
    />
    <FunctionButton
      :class="[
        'description-icon',
        { 'selected-icon': isSelected, 'hovered-icon': itemHovered },
      ]"
      @click="onClick"
      @dblclick.stop
    >
      <CircleHelp />
    </FunctionButton>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.node {
  width: 100px;
  height: 78px;
  margin: 0 2px;
  padding-bottom: 47px;
  position: relative;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  text-align: center;

  & label {
    max-height: 26px;
    max-width: 90px;
    /* stylelint-disable-next-line value-no-vendor-prefix */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    pointer-events: none;
  }

  & .node-preview {
    padding-bottom: 6px;
  }

  & svg {
    width: 70px;
    position: absolute;
    bottom: -15px;
    right: 15px;
  }

  & .add-action-button {
    position: absolute;
    inset: 0 0 0 50px;
    overflow: visible;
    width: auto;
  }

  &:hover {
    cursor: pointer;
  }

  & .description-icon {
    display: none;
    position: absolute;
    top: -8px;
    right: -6px;
    padding: 0;

    &.selected-icon {
      display: flex;
      align-items: center;
      justify-content: center;

      & svg {
        @mixin svg-icon-size 16;

        fill: var(--knime-masala);
        stroke: var(--knime-white);
        margin-right: -16px;
      }
    }

    &.hovered-icon {
      display: flex;
      align-items: center;
      justify-content: center;

      & svg {
        @mixin svg-icon-size 16;

        stroke: var(--knime-masala);
        margin-right: -16px;

        &:hover,
        &:focus {
          fill: var(--knime-masala);
          stroke: var(--knime-white);
        }
      }
    }

    /* &.selected-icon {
      display: flex;
      align-items: center;
      justify-content: center;

      & svg {
        @mixin svg-icon-size 16;
        fill: var(--knime-masala);
        stroke: var(--knime-white);
        margin-right: -16px;
      }
    } */
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
