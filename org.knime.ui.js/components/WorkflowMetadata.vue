<script>
import Description from '~webapps-common/ui/components/Description';
import NodeFeatureList from '~webapps-common/ui/components/node/NodeFeatureList';
import NodePreview from '~webapps-common/ui/components/node/NodePreview';
import TagList from '~webapps-common/ui/components/TagList';
import { formatDateString } from '~webapps-common/util/format';
import ScrollViewContainer from '~knime-ui/components/noderepo/ScrollViewContainer';
import ExternalResourcesList from '~knime-ui/components/common/ExternalResourcesList';

/** Displays metadata attached to a root-level workflow */
export default {
    components: {
        Description,
        NodeFeatureList,
        NodePreview,
        TagList,
        ScrollViewContainer,
        ExternalResourcesList
    },
    props: {
        /** Single-line description of the workflow */
        title: {
            type: String,
            default: null
        },
        /**  A detailed description of the workflow. */
        description: {
            type: String,
            default: null
        },
        /** The date and time of the last change made to this workflow. Formatted as ISO-String */
        lastEdit: {
            type: String,
            default: null
        },
        /** A list of links external resources (text, url) attached to the workflow */
        links: {
            type: Array,
            default: () => []
        },
        /** A list of tags the user chose to describe the workflow */
        tags: {
            type: Array,
            default: () => [],
            validator: tags => tags.every(tag => typeof tag === 'string')
        },
        /** Passed through to NodePreview.vue */
        nodePreview: {
            type: Object,
            default: null
        },
        /** Passed through to NodeFeatureList.vue */
        nodeFeatures: {
            type: Object,
            default: null
        },
        /**
         * Project or Component.
         * Tags, Last Update, External resources cannot be set in the AP for now
         * Influences whether they are rendered with placeholders or hidden completely
         */
        isComponent: {
            type: Boolean,
            default: false
        }
    },
    methods: {
        formatDateString
    }
};
</script>

<template>
  <!-- TODO: NXT-844 why use this stateful ScrollViewContainer here? -->
  <ScrollViewContainer class="metadata">
    <h2 :class="['title', { 'with-node-preview': nodePreview }]">
      <div
        v-if="nodePreview"
        class="node-preview"
      >
        <NodePreview v-bind="nodePreview" />
      </div>

      <span v-if="title">{{ title }}</span>
      <span
        v-else
        class="placeholder"
      >No title has been set yet</span>
    </h2>

    <hr v-if="!nodePreview">

    <div
      v-if="!isComponent"
      class="last-updated"
    >
      <span v-if="lastEdit">Last update: {{ formatDateString(lastEdit) }}</span>
      <span v-else>Last update: no update yet</span>
    </div>

    <div class="description">
      <Description
        v-if="description"
        :text="description"
      />
      <span
        v-else
        class="placeholder padded"
      >No description has been set yet</span>
    </div>

    <NodeFeatureList
      v-if="nodeFeatures"
      :in-ports="nodeFeatures.inPorts"
      :dyn-in-ports="nodeFeatures.dynInPorts"
      :out-ports="nodeFeatures.outPorts"
      :dyn-out-ports="nodeFeatures.dynOutPorts"
      :views="nodeFeatures.views"
      :options="nodeFeatures.options"
      sanitize-content
      class="node-feature-list"
    />

    <ExternalResourcesList
      v-if="!isComponent"
      :links="links"
    />

    <div
      v-if="!isComponent"
      class="tags"
    >
      <h2>Tags</h2>
      <hr>
      <TagList
        v-if="tags.length"
        :tags="tags"
      />
      <div
        v-else
        class="placeholder padded"
      >
        No tags have been set yet
      </div>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.metadata {
  box-sizing: border-box;
  padding: 8px 20px 20px;
  font-family: "Roboto Condensed", sans-serif;
  font-size: 16px;
  color: var(--knime-masala);

  & h2 {
    margin: 0;
    font-weight: 400;
    font-size: 18px;
    line-height: 36px;
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0;
  }

  & .placeholder {
    font-style: italic;
    color: var(--knime-dove-gray);

    &.padded {
      padding-top: 10px;
    }
  }

  & > *:last-child {
    margin-bottom: 0;
  }

  & .title {
    display: flex;
    align-items: center;
    margin-bottom: 5px;

    & .node-preview {
      height: 80px;
      width: 80px;
      margin-right: 9px;
      background-color: white;
      flex-shrink: 0;
    }

    &.with-node-preview {
      margin-bottom: 20px;
    }
  }
}

.last-updated {
  color: var(--knime-dove-gray);
  margin-top: 10px;
  margin-bottom: 20px;
  font-style: italic;
}

.description {
  margin-bottom: 20px;
  font-size: 16px;
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

.tags {
  padding-top: 5px;

  & .wrapper {
    padding: 13px 0;
  }

  & ul {
    display: flex;
    flex-wrap: wrap;
    list-style: none;
    padding: 0;

    & li {
      border: 1px solid var(--knime-masala);
      padding: 2px 6px;
      font-size: 14px;
      line-height: 21px;
      margin-bottom: 10px;
      margin-right: 5px;
      background-color: var(--knime-white);
    }
  }
}
</style>
