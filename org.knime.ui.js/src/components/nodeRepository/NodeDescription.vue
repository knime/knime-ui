<script>
import Description from "webapps-common/ui/components/Description.vue";
import NodeFeatureList from "webapps-common/ui/components/node/NodeFeatureList.vue";
import ExternalResourcesList from "@/components/common/ExternalResourcesList.vue";

import { API } from "@api";

/*
 * Base component for the NodeDescriptionOverlay for the nodeRepo, also used in the ContextAwareDescription for nodes
 * of the workflow
 */
export default {
  components: {
    Description,
    NodeFeatureList,
    ExternalResourcesList,
  },
  props: {
    selectedNode: {
      type: Object,
      default: null,
      validator: (node) =>
        node === null ||
        (typeof node.nodeFactory?.className === "string" &&
          typeof node.name === "string"),
    },
  },
  data() {
    return {
      descriptionData: null,
    };
  },
  computed: {
    title() {
      if (!this.selectedNode) {
        return "";
      }
      return this.selectedNode.name;
    },
  },
  watch: {
    // update description on change of node (if not null which means unselected)
    selectedNode: {
      immediate: true,
      async handler() {
        // reset data
        const { selectedNode } = this;
        if (selectedNode === null) {
          return;
        }

        this.descriptionData = await this.$store.dispatch(
          "nodeRepository/getNodeDescription",
          { selectedNode },
        );

        this.redirectLinks(API.desktop.openUrlInExternalBrowser);
      },
    },
  },

  methods: {
    async redirectLinks(redirect) {
      await this.$nextTick();
      const descriptionEl = document.querySelector("#node-description-html");

      if (!descriptionEl) {
        return;
      }

      descriptionEl.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          redirect({ url: link.href });
          return false;
        });
      });
    },
  },
};
</script>

<template>
  <div class="node-description">
    <div class="header">
      <div class="header-content">
        <h2>{{ title }}</h2>
        <slot name="header-action" />
      </div>
      <hr />
    </div>
    <div class="node-info">
      <!-- The v-else should be active if the selected node is not visible, but the nodeDescriptionObject might still
             have some data as the selection is not cleared. -->
      <template v-if="selectedNode">
        <template v-if="descriptionData">
          <Description
            v-if="descriptionData.description"
            id="node-description-html"
            :text="descriptionData.description"
            render-as-html
          />

          <span v-else class="placeholder">
            There is no description for this node.
          </span>

          <ExternalResourcesList
            v-if="descriptionData.links"
            :model-value="descriptionData.links"
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
      <div v-else class="placeholder no-node">Please select a node</div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.node-description {
  height: 100%;
  padding-right: 8px;
  padding-bottom: 8px;
  overflow-y: auto;
  overflow-x: hidden;

  & .header {
    position: sticky;
    z-index: 1;
    top: 0;
    background-color: inherit;

    & .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px 20px 5px;

      & h2 {
        margin: 0;
        font-weight: 400;
        font-size: 18px;
        line-height: 36px;
      }
    }
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0 20px;
  }

  & .node-info {
    padding: 10px 20px;
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
    font-size: 13px;
    line-height: 150%;
    width: 310px;

    & :deep(h3) {
      font-size: 13px;
    }
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
      font-size: 13px;
      font-weight: 600;
      padding-left: 20px;
    }

    & :deep(h6) {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 0;
    }

    & :deep(.name) {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 0;
    }

    & :deep(.description) {
      font-size: 13px;
    }

    /* Style refinement for Options */

    & :deep(.options .panel) {
      padding-left: 10px;
      padding-right: 10px;
      margin-left: 14px;
      line-height: 150%;
      font-size: 13px;

      & .option-field-name {
        font-size: 13px;
      }

      /* Style refinement list in a collapsible */
      & .option-description {
        line-height: 150%;

        & ul {
          padding: 10px 0px 10px 20px;
        }
      }

      /* Style refinement list in a collapsible */
      & > .panel {
        margin-left: 3px;

        & ul {
          padding-left: 20px;
        }
      }

      /* Style refinement text outside a collapsible */
      & > div {
        padding-left: 0;
      }
    }

    /* Style refinement for Views */
    & :deep(.views-list) {
      & li {
        padding: 20px;
      }

      & .content {
        margin-top: 5px;
        margin-left: 30px;
      }

      & svg {
        margin-right: 8px;
      }
    }

    /* Style refinement for Ports */
    & :deep(.outports),
    & :deep(.inports) {
      padding: 20px;

      & svg {
        width: 9px;
        height: 9px;
        top: 5px;
      }
    }

    & :deep(.ports-list) {
      & > .wrapper {
        padding: 20px;
      }

      & .content {
        max-width: 100%;

        & ol {
          margin-left: 20px;
          margin-top: 22px;
        }

        & .dyn-ports-description {
          margin-top: 10px;
        }

        & .port-type {
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          font-size: 13px;
        }

        & .port-name,
        & .port-description {
          margin: 5px 0;
          font-size: 13px;
        }

        & svg {
          width: 9px;
          height: 9px;
          top: 5px;
          left: -17px;
        }
      }
    }
  }

  /* Style refinement for Code */
  & :deep(tt),
  & :deep(pre),
  & :deep(code),
  & :deep(samp) {
    font-size: 11px;
    line-height: 150%;
  }

  /* Style refinement for Tables */
  & :deep(table) {
    width: 100%;
    font-size: 11px;
    border-spacing: 3px 0;
    margin-left: 10px;

    & th,
    & td {
      padding: 2px 0;
    }
  }
}
</style>
