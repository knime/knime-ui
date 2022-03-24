<script>
import LinkList from '~/webapps-common/ui/components/LinkList';

/**
 * Wraps the webapps-common LinkList component to render them alongside a title and a separator
 */
export default {
    components: {
        LinkList
    },
    props: {
        links: {
            type: Array,
            required: true,
            default: () => []
        }
    }
};
</script>

<template>
  <div class="external-resources-list">
    <h2>External resources</h2>
    <hr>
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
</template>

<style lang="postcss" scoped>
.external-resources-list {
  margin-bottom: 15px;

  & h2 {
    margin: 0;
    font-weight: normal;
    font-size: 18px;
    line-height: 36px;
  }

  & hr {
    border: none;
    border-top: 1px solid var(--knime-silver-sand);
    margin: 0;
  }

  & ul {
    --icon-size: 16px;

    column-count: 1;
    margin-bottom: -6px;
    line-height: 18px;

    & >>> svg {
      top: 2px;
    }
  }

  & .placeholder {
    padding-top: 10px;
    font-style: italic;
    color: var(--knime-dove-gray);
  }
}
</style>
