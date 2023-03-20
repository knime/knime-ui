<script>
import { mapState, mapActions } from 'vuex';

import SearchResults from '@/components/nodeRepository/SearchResults.vue';
import DraggableNodeTemplate from '@/components/nodeRepository/DraggableNodeTemplate.vue';

/**
 * Search results that use nodeRepository store and the draggable node template (which also uses the store)
 */
export default {
    components: {
        DraggableNodeTemplate,
        SearchResults
    },
    emits: ['focusSearchBar'],
    expose: ['focusFirst'],
    computed: {
        ...mapState('nodeRepository', [
            'topNodes',
            'bottomNodes',
            'query',
            'selectedTags',
            'totalNumTopNodes',
            'isShowingBottomNodes'
        ]),
        ...mapState('application', ['hasNodeCollectionActive']),

        selectedNode: {
            get() {
                return this.$store.state.nodeRepository.selectedNode;
            },
            set(value) {
                this.$store.commit('nodeRepository/setSelectedNode', value);
            }
        },
        searchScrollPosition: {
            get() {
                return this.$store.state.nodeRepository.searchScrollPosition;
            },
            set(value) {
                this.$store.commit('nodeRepository/setSearchScrollPosition', value);
            }
        },
        searchActions() {
            return {
                searchTopNodesNextPage: this.searchTopNodesNextPage,
                searchBottomNodesNextPage: this.searchBottomNodesNextPage,
                toggleShowingBottomNodes: this.toggleShowingBottomNodes
            };
        }
    },
    methods: {
        ...mapActions('nodeRepository', [
            'searchTopNodesNextPage', 'searchBottomNodesNextPage', 'toggleShowingBottomNodes'
        ]),
        focusFirst() {
            this.$ref.searchResults?.focusFirst();
        }
    }
};
</script>

<template>
  <SearchResults
    v-model:selected-node="selectedNode"
    v-model:search-scroll-position="searchScrollPosition"
    :search-actions="searchActions"
    :is-showing-bottom-nodes="isShowingBottomNodes"
    :selected-tags="selectedTags"
    :query="query"
    :bottom-nodes="bottomNodes"
    :total-num-top-nodes="totalNumTopNodes"
    :top-nodes="topNodes"
    :draggable="true"
    :has-node-collection-active="hasNodeCollectionActive"
    @focus-search-bar="$emit('focusSearchBar', $event)"
  >
    <template #topNodeTemplate="slotProps">
      <DraggableNodeTemplate v-bind="slotProps" />
    </template>
    <template #bottomNodeTemplate="slotProps">
      <DraggableNodeTemplate v-bind="slotProps" />
    </template>
  </SearchResults>
</template>

<style lang="postcss" scoped>

</style>
