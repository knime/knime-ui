<script>
import NodePreview from 'webapps-common/ui/components/node/NodePreview.vue';

/**
 * Basic NodeTemplate without any drag or insert features. This component should stay reusable.
 */
export default {
    components: {
        NodePreview
    },
    expose: ['getNodePreview'],
    props: {
        /**
         * Additional to the properties of the NodeTemplate from the gateway API, this object
         * contains the port information (color and kind) which was mapped from the store
         */
        nodeTemplate: {
            type: Object,
            default: null
        },
        isSelected: {
            type: Boolean,
            default: false
        }
    },
    methods: {
        getNodePreview() {
            return this.$refs.nodePreview;
        }
    }
};
</script>

<template>
  <div
    class="node"
    :class="{ 'selected': isSelected }"
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
  </div>
</template>

<style lang="postcss" scoped>
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
    top: 0;
    bottom: 0;
    left: 50px;
    right: 0;
    overflow: visible;
    width: auto;
  }

  &:hover {
    cursor: pointer;

    & .node-preview {
      filter: url("#node-torso-shadow");
    }
  }
}

.selected {
  outline: calc(var(--selected-node-stroke-width-shape) * 1px) solid var(--selection-active-border-color);
  border-radius: calc(var(--selected-node-border-radius-shape) * 1px);
  background-color: var(--selection-active-background-color);
}
</style>
