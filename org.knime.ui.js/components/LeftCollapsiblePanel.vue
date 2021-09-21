<script>
import { mapState } from 'vuex';
import SwitchIcon from '~/webapps-common/ui/assets/img/icons/arrow-prev.svg?inline';
import { throttle } from 'lodash';

export default {
    components: {
        SwitchIcon
    },
    props: {
        /**
         *  Expanded width of the panel's content.
         *  Should be a fixed width.
         */
        width: {
            type: String,
            default: '250px',
            validator: (str) => /^\d+\w+$/.test(str)
        },
        /**
         * The hover title to be shown when the panel is collapsed
         */
        title: {
            type: String,
            default: null
        }
    },
    computed: {
        ...mapState('panel', ['expanded', 'activeTab'])
    },
    methods: {
        toggleExpanded() {
            this.$store.dispatch('panel/toggleExpanded');
        },
        onScroll: throttle(function () {
            /* eslint-disable no-invalid-this */
            if (this.activeTab === 'nodeRepository') {
                this.$root.$emit('scroll-node-repo');
            }
        }, 500)
    }
};
</script>

<template>
  <div class="panel">
    <div
      ref="scroller"
      class="container"
      :style="{ width: expanded ? width : 0 }"
      @scroll="onScroll"
    >
      <div :style="{ width }">
        <slot />
      </div>
    </div>
    <button
      :title="expanded ? null : title"
      @click="toggleExpanded"
    >
      <SwitchIcon :style="{ transform: expanded ? null : 'scaleX(-1)' }" />
    </button>
  </div>
</template>

<style lang="postcss" scoped>
.panel {
  display: flex;
  height: 100%;
  overflow-y: auto;
}

.container {
  background-color: var(--knime-gray-ultra-light);
  overflow-x: hidden;
  transition: width 0.3s ease;
  display: flex;
}

button {
  border: none;
  width: 10px;
  padding: 0;
  background-color: var(--knime-porcelain);
  cursor: pointer;

  &:hover {
    background-color: var(--knime-silver-sand-semi);
  }

  & svg {
    width: 10px;
    height: 10px;
    stroke: var(--knime-masala);
    stroke-width: calc(32px / 10);
    transition: transform 0.3s ease;
  }
}
</style>
