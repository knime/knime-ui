<script>
import { mapState } from 'vuex';

import ScrollViewContainer from '~/components/noderepo/ScrollViewContainer';
import NodeCategory from './NodeCategory.vue';

export default {
    components: {
        NodeCategory,
        ScrollViewContainer
    },
    computed: {
        ...mapState('nodeRepository', ['categoryScrollPosition', 'nodesPerCategory'])
    },
    methods: {
        onScrollBottom() {
            this.$store.dispatch('nodeRepository/getAllNodes', true);
        },
        // TODO: NXT-844 why do we save the scroll position instead of using keep-alive for the repo?
        // Also currently the NodeRepository isn't destroyed upon closing
        onSaveScrollPosition(position) {
            this.$store.commit('nodeRepository/setCategoryScrollPosition', position);
        },
        onSelectTag(tag) {
            this.$store.dispatch('nodeRepository/setSelectedTags', [tag]);
        }
    }
};
</script>

<template>
  <ScrollViewContainer
    class="results"
    :initial-position="categoryScrollPosition"
    @scroll-bottom="onScrollBottom"
    @save-position="onSaveScrollPosition"
  >
    <div class="content">
      <template v-for="({tag, nodes}) in nodesPerCategory">
        <NodeCategory
          :key="`tag-${tag}`"
          class="category"
          :tag="tag"
          :nodes="nodes"
          @select-tag="onSelectTag"
        />
        <hr :key="tag">
      </template>
    </div>
  </ScrollViewContainer>
</template>

<style lang="postcss" scoped>
.content {
  padding: 0 20px 15px;
}

hr {
  width: 360px;
  margin-left: -20px;
  margin-bottom: 14px;
  border: none;
  border-top: 1px solid var(--knime-silver-sand);

  &:last-child {
    display: none;
  }
}
</style>
