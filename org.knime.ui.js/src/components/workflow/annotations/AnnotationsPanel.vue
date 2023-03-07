<script>
import { mapState, mapActions } from 'vuex';

import ArrowNext from 'webapps-common/ui/assets/img/icons/arrow-next.svg';
import Metanode from 'webapps-common/ui/assets/img/icons/metanode.svg';

import SearchBar from '@/components/common/SearchBar.vue';

export default {
    components: {
        ArrowNext,
        Metanode,
        SearchBar
    },
    data() {
        return {
            searchQuery: ''
        };
    },
    computed: {
        ...mapState('workflow', ['activeWorkflow'])
    },
    methods: {
        ...mapActions('canvas', ['scroll']),
        scrollTo({ positionX, positionY }) {
            const padding = 25;
            this.scroll({ canvasX: positionX - padding, canvasY: positionY - padding });
        },
        truncateName(name) {
            const maxCharacters = 30;

            if (name.length === 0) {
                return 'Placeholder';
            }

            return name.length > maxCharacters ? `${name.slice(0, maxCharacters)} …` : name;
        }
    }
};
</script>

<template>
  <div class="annotations">
    <h2 :class="'title'">
      Workflow tree
    </h2>
    <hr>
    <SearchBar
      v-model="searchQuery"
      class="search-bar"
    />
    <ul class="annotation-list">
      <li
        v-for="annotation in activeWorkflow.workflowAnnotations"
        :key="annotation.id"
        class="annotation-item"
        @click="scrollTo({
          positionX: annotation.bounds.x,
          positionY: annotation.bounds.y
        })"
      >
        <ArrowNext class="annotation-item-symbol" />
        <Metanode
          class="annotation-item-icon"
          :stroke="annotation.borderColor"
        />
        {{ truncateName(annotation.text) }}
      </li>
    </ul>
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

.annotations {
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
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
  
  & .title {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
  }

  & .search-bar {
    margin-top: 10px;
    height: 40px;
    font-size: 17px;

  &:hover {
    background-color: var(--knime-silver-sand-semi);
  }

  &:focus-within {
    background-color: var(--knime-white);
    border-color: var(--knime-masala);
  }
}

  & .annotation-list {
    list-style: none;
    margin-left: 0;
    padding-left: 0;

    & .annotation-item {
      padding: 8px 10px;
      border: none;
      border-bottom: 1px solid var(--knime-silver-sand-semi);
      margin: 0;

      & .annotation-item-symbol {
        @mixin svg-icon-size 14;

        margin-right: 10px;
      }

      & .annotation-item-icon {
        @mixin svg-icon-size 14;

        margin-right: 2px;
      }

    }

      & .annotation-item:last-child {
        border-bottom: none;
      }

    &:hover {
      cursor: pointer;
    }
  }
}

</style>
