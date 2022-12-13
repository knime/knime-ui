<script>
// import Button from 'webapps-common/ui/components/Button.vue';

/** SVG Button that is displayed above a hovered or selected node */
export default {
    components: {
        //        Button
    },
    props: {
        rowTitle: {
            type: String,
            default: null
        },
        icon: {
            type: String,
            default: null
        },
        image: {
            type: String,
            default: null
        },
        bodyText: {
            type: String,
            default: null
        }
    }
};
</script>

<template>
  <div class="grid-container">
    <div class="grid-item-3">
      {{ icon }}{{ rowTitle }}
    </div>
    <div class="grid-item-9">
      {{ bodyText }}
    </div>
  </div>
</template>

<style lang="postcss" scoped>

</style>
