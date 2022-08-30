<script>
import TagList from '~/webapps-common/ui/components/TagList.vue';
import MetadataPlaceholder from './MetadataPlaceholder.vue';

export default {
    components: {
        MetadataPlaceholder,
        TagList
    },
    props: {
        tags: {
            type: Array,
            default: () => []
        }
    }
};
</script>

<template>
  <div class="tags">
    <h2>Tags</h2>
    <hr>
    <TagList
      v-if="tags.length"
      :tags="tags"
    />
    <MetadataPlaceholder
      v-else
      padded
      text="No tags have been set yet"
    />
  </div>
</template>

<style lang="postcss" scoped>
h2 {
  margin: 0;
  font-weight: 400;
  font-size: 18px;
  line-height: 36px;
}

hr {
  border: none;
  border-top: 1px solid var(--knime-silver-sand);
  margin: 0;
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
