<script>
import LinkList from '~/webapps-common/ui/components/LinkList';
import NodeFeatureList from '~/webapps-common/ui/components/node/NodeFeatureList';
import NodePreview from '~/webapps-common/ui/components/node/NodePreview';
import { formatDateString } from '~/webapps-common/util/format';

/** Displays metadata attached to a root-level workflow */
export default {
    components: {
        LinkList,
        NodeFeatureList,
        NodePreview
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
         * Tags, Last Update, External ressources cannot be set in the AP for now
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
  <div class="metadata">
    <h2 class="title">
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

    <div
      v-if="!isComponent"
      class="last-updated"
    >
      <span v-if="lastEdit">Last Update: {{ formatDateString(lastEdit) }}</span>
      <span
        v-else
        class="placeholder"
      >Last Update: no update yet</span>
    </div>

    <div
      class="description"
    >
      <span v-if="description">{{ description }}</span>
      <span
        v-else
        class="placeholder"
      >No description has been set yet</span>
    </div>

    <NodeFeatureList
      v-if="nodeFeatures"
      v-bind="nodeFeatures"
      class="node-feature-list"
    />

    <div
      v-if="!isComponent"
      class="external-ressources"
    >
      <h2>External Ressources</h2>
      <LinkList
        v-if="links.length"
        :links="links"
      />
      <div
        v-else
        class="placeholder"
      >
        No links have been added yet
      </div>
    </div>

    <div
      v-if="!isComponent"
      class="tags"
    >
      <h2>Tags</h2>
      <ul v-if="tags.length">
        <li
          v-for="tag of tags"
          :key="tag"
        >
          {{ tag }}
        </li>
      </ul>
      <div
        v-else
        class="placeholder"
      >
        No tags have been set yet
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.metadata {
  box-sizing: border-box;
  padding: 20px 20px;
  font-family: "Roboto Condensed", sans-serif;
  font-size: 18px;
  line-height: 27px;
  color: var(--knime-masala);

  & h2 {
    margin: 0;
    font-weight: normal;
    font-size: 24px;
    line-height: 36px;
  }

  & .placeholder {
    font-style: italic;
  }

  & > *:last-child {
    margin-bottom: 0;
  }

  & .title {
    display: flex;
    align-items: center;
    margin-bottom: 20px;

    & .node-preview {
      height: 80px;
      width: 80px;
      margin-right: 9px;
      background-color: white;
      flex-shrink: 0;
    }
  }
}

.last-updated {
  margin-bottom: 20px;
  font-style: italic;
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

.external-ressources {
  margin-bottom: 38px;

  & ul {
    column-count: 1;
    margin-bottom: -6px;

    & >>> li {
      font-size: 18px;
      line-height: 27px;
    }
  }
}

.tags {
  padding-top: 5px;

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
