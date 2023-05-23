<script>
import PageSideMenuListItem from "./PageSideMenuListItem.vue";

export default {
  components: {
    PageSideMenuListItem,
  },
  props: {
    items: {
      type: Array,
      default: () => [],
    },
  },
};
</script>

<template>
  <ul>
    <PageSideMenuListItem v-for="item in items" :key="item.text" :item="item" />
  </ul>
</template>

<style lang="postcss" scoped>
ul {
  margin: 0;
  list-style-type: none;
  padding: 0;
}

/* horizontal mode fixed on screen bottom */
@media only screen and (max-width: 900px) {
  ul {
    display: flex;
    justify-content: space-evenly;
    align-items: baseline;
  }
}
</style>
