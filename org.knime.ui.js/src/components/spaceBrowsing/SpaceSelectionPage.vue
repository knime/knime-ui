<script>
import Page from '@/components/common/Page.vue';
import PageHeader from '@/components/common/PageHeader.vue';
// import PageSideMenu from '@/components/common/PageSideMenu.vue';

export default {
    components: {
        Page,
        PageHeader
    }
};
</script>

<template>
  <Page>
    <PageHeader
      :left-offset="3"
      title="Spaces"
    />
  </Page>
</template>

<style lang="postcss" scoped>

</style>
