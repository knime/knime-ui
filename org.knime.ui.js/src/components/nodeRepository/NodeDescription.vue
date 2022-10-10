<script>
import { mapState, mapActions, mapGetters } from 'vuex';

import CloseIcon from '@/assets/cancel.svg';
import Description from 'webapps-common/ui/components/Description.vue';
import NodeFeatureList from 'webapps-common/ui/components/node/NodeFeatureList.vue';

import { escapeStack } from '@/mixins/escapeStack';
import ExternalResourcesList from '@/components/common/ExternalResourcesList.vue';

export default {
    components: {
        CloseIcon,
        Description,
        NodeFeatureList,
        ExternalResourcesList
    },
    mixins: [
        escapeStack({
            onEscape() {
                this.closeDescriptionPanel();
            }
        })
    ],
    computed: {
        ...mapState('nodeRepository', ['selectedNode', 'nodeDescriptionObject']),
        ...mapGetters('nodeRepository', ['selectedNodeIsVisible'])
    },
    watch: {
        // update description on change of node (if not null which means unselected)
        selectedNode: {
            immediate: true,
            handler() {
                if (this.selectedNode !== null) {
                    this.getNodeDescription();
                }
            }
        }
    },
    methods: {
        ...mapActions('nodeRepository', ['getNodeDescription', 'closeDescriptionPanel'])
    }
};
</script>

<template>
  <div class="node-description">
    <div class="header">
      <h2>{{ selectedNodeIsVisible ? selectedNode.name : '&nbsp;' }}</h2>
      <button
        @click="closeDescriptionPanel"
      >
        <CloseIcon class="icon" />
      </button>
    </div>

    <hr>

    <div class="scroll-container">
      <div class="node-info">
        <!-- The v-else should be active if the selected node is not visible, but the nodeDescriptionObject might still
             have some data as the selection is not cleared. -->
        <template v-if="selectedNodeIsVisible">
          <template v-if="nodeDescriptionObject">
            <Description
              v-if="nodeDescriptionObject.description"
              :text="nodeDescriptionObject.description"
              render-as-html
            />

            <span
              v-else
              class="placeholder"
            >
              There is no description for this node.
            </span>

            <ExternalResourcesList :links="nodeDescriptionObject.links" />

            <NodeFeatureList
              :in-ports="nodeDescriptionObject.inPorts"
              :dyn-in-ports="nodeDescriptionObject.dynInPorts"
              :out-ports="nodeDescriptionObject.outPorts"
              :dyn-out-ports="nodeDescriptionObject.dynOutPorts"
              :views="nodeDescriptionObject.views"
              :options="nodeDescriptionObject.options"
              class="node-feature-list"
            />
          </template>
        </template>
        <div
          v-else
          class="placeholder no-node"
        >
          Please select a node
        </div>
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
    align-items: flex-start;
    padding: 0 20px 5px;

    & h2 {
      margin: 0;
      font-weight: 400;
      font-size: 18px;
      line-height: 36px;
    }

    & button {
      width: 40px;
      margin-top: 2px;
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
    display: flex;
    min-height: 100%;
    flex-direction: column;
  }

  & .placeholder {
    font-style: italic;
    color: var(--knime-dove-gray);

    &.no-node {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
    }
  }

  & .description {
    font-size: 16px;
    width: 310px;
  }

  & .node-feature-list {
    margin-top: 6px;
    margin-bottom: 40px;

    & :deep(.shadow-wrapper::after),
    & :deep(.shadow-wrapper::before) {
      display: none;
    }

    /* Style refinement for Feature List; Ports, Options, Views  */

    & :deep(h5) {
      font-size: 16px;
    }

    & :deep(h6) {
      font-size: 16px;
      margin-bottom: 0;
    }

    & :deep(.description) {
      font-size: 13px;
    }

    /* Style refinement for Options */

    & :deep(.options .panel) {
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
    & :deep(.views-list) {
      & .content {
        margin-top: 5px;
        margin-left: 30px;
      }

      & svg {
        margin-right: 8px;
      }
    }

    /* Style refinement for Ports */
    & :deep(.ports-list) {
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
  & :deep(tt),
  & :deep(pre),
  & :deep(code),
  & :deep(samp) {
    font-size: 13px;
    line-height: 24px;
  }

  /* Style refinement for Tables */
  & :deep(table) {
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
