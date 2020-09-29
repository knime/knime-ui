<script>
import { mapState } from 'vuex';
import Kanvas from '~/components/Kanvas';

/**
 * A component that shows the tab contents belonging to one workflow,
 * i.e. toolbar, canvas, etc.
 */
export default {
    components: {
        Kanvas
    },
    computed: {
        ...mapState('workflows', ['workflow'])
    }
};
</script>

<template>
  <Kanvas v-if="workflow" />
  <div
    v-else
    class="placeholder"
  >
    <h2>
      No workflow opened
    </h2>
  </div>
</template>

<style lang="postcss" scoped>
.placeholder {
  height: 55%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--knime-stone-gray);
}
</style>
