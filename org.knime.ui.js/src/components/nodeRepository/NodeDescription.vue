<script>
import Description from 'webapps-common/ui/components/Description.vue';
import NodeFeatureList from 'webapps-common/ui/components/node/NodeFeatureList.vue';
import ExternalResourcesList from '@/components/common/ExternalResourcesList.vue';

/*
 * Base component for the NodeDescriptionOverlay for the nodeRepo, also used in the ContextAwareMetadata for nodes
 * of the workflow
 */
export default {
    components: {
        Description,
        NodeFeatureList,
        ExternalResourcesList
    },
    props: {
        selectedNode: {
            type: Object,
            required: true
        }
    },
    data() {
        return {
            descriptionData: null
        };
    },
    computed: {
        title() {
            if (!this.selectedNode) {
                return '';
            }
            return this.selectedNode.name;
        }
    },
    watch: {
        // update description on change of node (if not null which means unselected)
        selectedNode: {
            immediate: true,
            async handler() {
                const { selectedNode } = this;
                if (selectedNode === null) {
                    return;
                }

                this.descriptionData = await this.$store.dispatch(
                    'nodeRepository/getNodeDescription',
                    { selectedNode }
                );
            }
        }
    }
};
</script>

<template>
  <div class="node-description">
    <div class="header">
      <h2>{{ title }}</h2>
      <slot name="header-action" />
    </div>

    <hr>

    <div class="scroll-container">
      <div class="node-info">
        <!-- The v-else should be active if the selected node is not visible, but the nodeDescriptionObject might still
             have some data as the selection is not cleared. -->
        <template v-if="selectedNode">
          <template v-if="descriptionData">
            <Description
              v-if="descriptionData.description"
              :text="descriptionData.description"
              render-as-html
            />

            <span
              v-else
              class="placeholder"
            >
              There is no description for this node.
            </span>

            <ExternalResourcesList
              v-if="descriptionData.links"
              :links="descriptionData.links"
            />

            <NodeFeatureList
              :in-ports="descriptionData.inPorts"
              :dyn-in-ports="descriptionData.dynInPorts"
              :out-ports="descriptionData.outPorts"
              :dyn-out-ports="descriptionData.dynOutPorts"
              :views="descriptionData.views"
              :options="descriptionData.options"
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
  height: 100%;
  padding: 8px 0;
  font-family: "Roboto Condensed", sans-serif;

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
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0 20px;
  }

  & .scroll-container {
    overflow-x: hidden;
    text-align: left;
    height: 100%;
  }

  & .node-info {
    padding: 10px 20px 172px;
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
