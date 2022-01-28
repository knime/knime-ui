<script>
import { mapState, mapGetters } from 'vuex';
import CloseIcon from '~/assets/cancel-execution.svg?inline';
// import NodeFeatureList from '~/webapps-common/ui/components/node/NodeFeatureList';

export default {
    components: {
        CloseIcon
        // NodeFeatureList
    },
    computed: {
        ...mapState('panel', ['additionalPanel', 'activeTab']),
        ...mapGetters('panel', ['additionalPanelActive'])
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
      <h2 class="title">Counter Generation</h2>
      <button
        v-show="additionalPanelActive"
        @click="closePanel"
      >
        <CloseIcon class="icon" />
      </button>
    </div>
    <div
      class="description"
    >
      <!-- <span v-if="description">{{ description }}</span>
      <span
        v-else
        class="placeholder"
      >No description has been set yet</span> -->
      <span>Lorem ipsum dolor sit amet consectetur adipisicing elit. Veritatis blanditiis tempora sequi ut mollitia nemo, omnis explicabo autem deserunt ex nam, consequuntur ducimus, possimus doloremque. Provident saepe eveniet quos sapiente nobis eligendi expedita at voluptatem repudiandae, labore, id dolores blanditiis.</span>
    </div>
    <!-- <NodeFeatureList
      v-if="nodeFeatures"
      v-bind="nodeFeatures"
      class="node-feature-list"
    /> -->
  </div>
</template>

<style lang="postcss" scoped>
.node-description {
  width: 360px;
  font-family: "Roboto Condensed", sans-serif;
  height: 100%;
  background-color: var(--knime-gray-ultra-light);
  padding: 10px;
  font-size: 16px;
}

button {
  width: 40px;
  border: none;
  background-color: var(--knime-gray-ultra-light);
}

.header {
  display: flex;
  justify-content: space-between;
}

.icon {
  &:hover {
    cursor: pointer;
  }
}

.title {
  margin: 0;
  font-weight: normal;
  font-size: 18px;
  line-height: 36px;
}

.description {
  margin-bottom: 20px;
  white-space: break-spaces;
  word-wrap: break-word;
}

.node-feature-list {
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
</style>
