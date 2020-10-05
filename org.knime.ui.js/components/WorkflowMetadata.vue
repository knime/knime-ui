<script>
// TODO: unit test
import LinkList from '~/webapps-common/ui/components/LinkList';
import { formatDateString } from '~/webapps-common/util/format';

export default {
    components: {
        LinkList
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
            // validator: x => x === new Date(x).toISOString()
        },
        /** A collection of external ressources (text, url) attached to the workflow */
        links: {
            type: Array,
            default: null
            // validator: xs => xs.every(({ text, url }) => text && url)
        },
        /** A collection of tags the user chose to describe the workflow */
        tags: {
            type: Array,
            default: null
            // validator: xs => xs.every(x => typeof x === 'string')
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
      <span v-if="title">{{ title }}</span>
      <span
        v-else
        class="placeholder"
      >No title has been set yet</span>
    </h2>
    
    <div class="last-updated">
      <span v-if="lastEdit">Last Update: {{ formatDateString(lastEdit) }}</span>
      <span
        v-else
        class="placeholder"
      >Last Update: no update yet</span>
    </div>
    
    <div v-if="description">{{ description }}</div>

    <div class="external-ressources">
      <h2>External Ressources</h2>
      <LinkList
        v-if="links && links.length"
        :links="links"
      />
      <div
        v-else
        class="placeholder"
      >
        No links have been added yet
      </div>
    </div>

    <div class="tags">
      <h2>Tags</h2>
      <ul v-if="tags && tags.length">
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
  padding: 10px 20px;
  width: 360px;
  font-family: "Roboto Condensed", sans-serif;
  font-size: 18px;
  line-height: 27px;
  color: var(--knime-masala);
}

.placeholder {
  font-style: italic;
}

h2 {
  margin: 0;
  font-weight: normal;
  font-size: 24px;
  line-height: 36px;
}

.last-updated {
  margin: 21px 0;
  font-style: italic;
}

.external-ressources {
  margin-top: 38px;

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
  margin-top: 38px;
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
