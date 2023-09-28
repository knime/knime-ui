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
    showFloatingHelpIcon: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      nodeHovered: false,
    };
  },
  computed: {
    ...mapState("nodeRepository", ["isDescriptionPanelOpen"]),
    ...mapState("application", ["mode"]),
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
    }"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
  >
    <span :title="nodeTemplate.name">{{ nodeTemplate.name }}</span>
    <NodePreview
      ref="nodePreview"
      class="node-preview"
      :type="nodeTemplate.type"
      :in-ports="nodeTemplate.inPorts"
      :out-ports="nodeTemplate.outPorts"
      :icon="nodeTemplate.icon"
      :dark="mode === 'dark'"
    />
    <FunctionButton
      v-if="showFloatingHelpIcon"
      :class="[
        'description-icon',
        { 'selected-icon': isSelected, 'hovered-icon': nodeHovered },
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

  & span {
    max-height: 26px;
    max-width: 90px;
    /* stylelint-disable-next-line value-no-vendor-prefix */
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    color: var(--texts-text-primary);
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

  &:hover {
    cursor: pointer;
  }

  &.grabbable:hover {
    cursor: grab;
  }

  & .description-icon {
    display: none;
    position: absolute;
    top: 2px;
    right: -2px;
    padding: 0;

    &.hovered-icon {
      display: flex;
      align-items: center;
      justify-content: center;

      & svg {
        @mixin svg-icon-size 16;

        fill: var(--knime-white);
        stroke: var(--knime-masala);
        margin-right: -16px;
      }
    }

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

    &.hovered-icon svg:hover {
      fill: var(--knime-masala);
      stroke: var(--knime-white);
    }
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
