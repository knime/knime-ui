<script>
import { mapState, mapMutations, mapActions } from 'vuex';

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
        ...mapActions('nodeRepository', ['getAllNodes', 'setSelectedTags']),
        ...mapMutations('nodeRepository', ['setCategoryScrollPosition']),

        onScrollBottom() {
            this.getAllNodes({ append: true });
        },
        onSaveScrollPosition(position) {
            this.setCategoryScrollPosition(position);
        },
        onSelectTag(tag) {
            this.setSelectedTags([tag]);
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
      <template v-for="({ tag, nodes }) in nodesPerCategory">
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
