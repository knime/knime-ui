<script>
// TODO: use real data from API
// TODO: unit test
import LinkList from '~/webapps-common/ui/components/LinkList';

export default {
    components: {
        LinkList
    },
    data: () => ({
        title: 'Indexing and searching plug-in for address database cleansing',
        lastUpdated: 'Last Update: 18 Feb 2020',
        description: 'This workflow demonstrates the Indexing & Searching plugin for address database cleansing. It uses fuzzy queries to identify typos in a given address data base. First an index is created on the data table. Once the index has been created it can be queried using a powerful query language. The query syntax bases on the Lucene query syntax and supports among others phrase queries, wildcard queries, fuzzy queries, proximity queries, range queries, term boosting, grouping and boolean operators.',
        tags: ['ETL', 'query', 'indexing'],
        externalRessources: [
            { text: 'Indexing and Searching', url: 'https://google.com' },
            { text: 'That short paper', url: 'https://bing.com' },
            { text: 'That verly long and very influential paper', url: 'https://bing.com' },
            { text: 'Another one', url: 'https://bing.com' }
        ]
    })
};
</script>

<template>
  <div class="metadata">
    <h2 class="title">{{ title }}</h2>
    <div class="last-updated">Last Update {{ lastUpdated }}</div>
    <div class="description">{{ description }}</div>

    <div
      v-if="externalRessources"
      class="external-ressources"
    >
      <h2>External Ressources</h2>
      <LinkList :links="externalRessources" />
    </div>

    <div
      v-if="tags"
      class="tags"
    >
      <h2>Tags</h2>
      <ul class="tags">
        <li
          v-for="tag of tags"
          :key="tag"
        >
          {{ tag }}
        </li>
      </ul>
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

.description {
  /* margin-bottom: 36px; */
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

  & ul {
    display: flex;
    flex-wrap: wrap;
    margin-top: 5px;
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
