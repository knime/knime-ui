<script>
import Kanvas from '~/components/Kanvas';

export default {
    components: {
        Kanvas
    },
    fetch() {
        this.$store.dispatch('workflows/load');
    }
};
</script>

<template>
  <div class="frame">
    <Kanvas />
  </div>
</template>

<style scoped>
.frame {
  border: 2px dotted gray;
  margin: 20px;
}
</style>
