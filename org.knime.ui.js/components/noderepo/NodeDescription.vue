<script>
import { mapState, mapActions, mapGetters } from 'vuex';
import CloseIcon from '~/assets/cancel-execution.svg?inline';
import Description from '~/webapps-common/ui/components/Description';
import NodeFeatureList from '~/webapps-common/ui/components/node/NodeFeatureList';

export default {
    components: {
        CloseIcon,
        Description,
        NodeFeatureList
    },
    computed: {
        ...mapState('panel', ['activeDescriptionPanel']),
        ...mapState('nodeRepository', ['selectedNode', 'nodeDescriptionObject', 'nodes', 'nodesPerCategory']),
        ...mapGetters('nodeRepository', ['searchIsActive']),
        isVisible() {
            if (this.searchIsActive) {
                return this.nodes.some(node => node.id === this.selectedNode.id);
            } else {
                return this.nodesPerCategory.some(category => category.nodes.some(
                    node => node.id === this.selectedNode.id
                ));
            }
        }
    },
    watch: {
        selectedNode: {
            immediate: true,
            handler() {
                this.getNodeDescription();
            }
        }
    },
    methods: {
        ...mapActions('panel', ['closeDescriptionPanel']),
        ...mapActions('nodeRepository', ['getNodeDescription'])
    }
};
</script>

<template>
  <div class="node-description">
    <div class="header">
      <h2 v-if="isVisible">{{ selectedNode.name }}</h2>
      <h2 v-else>&nbsp;</h2>
      <button
        v-show="activeDescriptionPanel"
        @click="closeDescriptionPanel"
      >
        <CloseIcon class="icon" />
      </button>
    </div>
    <hr>
    <div class="scroll-container">
      <div class="node-info">
        <Description
          v-if="nodeDescriptionObject && isVisible"
          :text="nodeDescriptionObject.description"
          :render-as-html="true"
        />
        <div v-else class="no-selected-node-visible">Please select a node</div>
        <span v-if="nodeDescriptionObject && !nodeDescriptionObject.description">
          There is no description for this node.
        </span>
        <NodeFeatureList
          v-if="nodeDescriptionObject && isVisible"
          v-bind="nodeDescriptionObject"
          class="node-feature-list"
        />
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.node-description {
  width: 360px;
  font-family: "Roboto Condensed", sans-serif;
  height: 100%;
  background-color: var(--knime-gray-ultra-light);
  padding: 8px 0 172px;
  position: fixed;
  left: 400px;
  z-index: 2;
  border: solid var(--knime-silver-sand);
  border-width: 0 1px;

  & .header {
    display: flex;
    justify-content: space-between;
    padding: 0 20px 5px;

    & h2 {
      margin: 0;
      font-weight: normal;
      font-size: 18px;
      line-height: 36px;
    }

    & button {
      width: 40px;
      margin-right: -15px;
      border: none;
      display: flex;
      align-items: center;
      background-color: transparent;

      & .icon {
        border: 0;
        border-radius: 20px;
        stroke: var(--knime-dove-gray);
        width: 40px;

        &:hover {
          cursor: pointer;
          background-color: var(--knime-silver-sand-semi);
          stroke: var(--knime-masala);
        }
      }
    }
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0 20px;
  }

  & .scroll-container {
    background-color: var(--knime-gray-ultra-light);
    overflow-x: hidden;
    text-align: left;
    height: 100%;
  }

  & .node-info {
    padding: 10px 20px 0;

    & .no-selected-node-visible {
      position: relative;
      height: calc(100vh - 192px); /* sum of all the heights from AppHeader, WorkflowToolbar, NodeDescription Header and all separators */
      display: flex;
      align-items: center;
      justify-content: center;
      padding-top: 110px; /* vertical alignment to get to the same height as the empty message in the noderepo search results */
    }
  }

  & .description {
    font-size: 16px;
    margin-bottom: 20px;
    width: 310px;
  }

  & .node-feature-list {
    margin-bottom: 40px;

    & >>> .shadow-wrapper::after,
    & >>> .shadow-wrapper::before {
      display: none;
    }

    /* Style refinement for Feature List; Ports, Options, Views  */

    & >>> h5 {
      font-size: 16px;
    }

    & >>> h6 {
      font-size: 16px;
      margin-bottom: 0;
    }

    & >>> .description {
      font-size: 13px;
    }

    /* Style refinement for Options */

    & >>> .options .panel {
      padding-left: 10px;
      padding-right: 10px;
      margin-left: 25px;

      /* Style refinement list in a collapsible */
      & > .panel {
        margin-left: 3px;
      }

      /* Style refinement text outside a collapsible */
      & > div {
        padding-left: 0;
      }
    }

    /* Style refinement for Views */
    & >>> .views-list {
      & .content {
        margin-top: 5px;
        margin-left: 30px;
      }

      & svg {
        margin-right: 8px;
      }
    }

    /* Style refinement for Ports */
    & >>> .ports-list {
      & .content {
        & ol {
          margin-left: 28px;
          margin-top: 22px;
        }

        & .dyn-ports-description {
          margin-top: 10px;
        }
      }
    }
  }

  /* Style refinement for Code */
  & >>> tt,
  & >>> pre,
  & >>> code,
  & >>> samp {
    font-size: 13px;
    font-family: monospace;
    line-height: 24px;
  }

  /* Style refinement for Tables */
  & >>> table {
    width: 100%;
    font-size: 12px;
    border-spacing: 5px 0;
    margin-left: 10px;

    & th,
    & td {
      padding: 4px 0;
    }
  }
}
</style>
