<script>
import { mapState } from 'vuex';
import CloseIcon from '~/assets/cancel-execution.svg?inline';
import Description from '~/webapps-common/ui/components/Description';
import NodeFeatureList from '~/webapps-common/ui/components/node/NodeFeatureList';
import ScrollViewContainer from './ScrollViewContainer.vue';

export default {
    components: {
        CloseIcon,
        Description,
        NodeFeatureList,
        ScrollViewContainer
    },
    computed: {
        ...mapState('panel', ['additionalPanel']),
        ...mapState('nodeRepository', ['selectedNode', 'nodeWithDescription'])
    },
    methods: {
        closePanel() {
            this.$store.dispatch('panel/closeAdditionalPanel');
        }
    }
};
</script>

<template>
  <div class="node-description">
    <div class="header">
      <h2>{{ selectedNode.name }}</h2>
      <button
        v-show="additionalPanel"
        @click="closePanel"
      >
        <CloseIcon />
      </button>
    </div>
    <hr>
    <ScrollViewContainer>
      <div class="node-info">
        <Description
          v-if="nodeWithDescription"
          :text="nodeWithDescription.description"
          :render-as-html="true"
        />
        <NodeFeatureList
          v-if="nodeWithDescription"
          v-bind="nodeWithDescription"
          class="node-feature-list"
        />
      </div>
    </ScrollViewContainer>
  </div>
</template>

<style lang="postcss" scoped>
.node-description {
  width: 360px;
  font-family: "Roboto Condensed", sans-serif;
  height: 100%;
  background-color: var(--knime-gray-ultra-light);
  padding: 10px 0 172px;
  font-size: 16px;
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
      background-color: var(--knime-gray-ultra-light);

      &:hover {
        cursor: pointer;
      }
    }
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0;
  }

  & .node-info {
    padding: 10px 20px 0;
  }

  & .node-feature-list {
    margin-bottom: 40px;

    & >>> .shadow-wrapper::after,
    & >>> .shadow-wrapper::before {
      display: none;
    }

    & >>> h6 {
      font-size: 16px;
      margin-bottom: 0;
    }

    & >>> .description {
      font-size: 16px;
    }

    /* Style refinement for Options */
    & >>> .options .panel {
      padding-left: 0;
      margin-left: 52px;

      & li > * {
        margin-left: 8px;
      }

      & .option-field-name {
        margin-bottom: 5px;
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
}

</style>
