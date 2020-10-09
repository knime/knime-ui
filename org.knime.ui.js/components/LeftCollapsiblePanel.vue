<script>
import SwitchIcon from '~/webapps-common/ui/assets/img/icons/arrow-prev.svg?inline';

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
    data() {
        return {
            collapsed: false
        };
    }
};
</script>

<template>
  <div class="panel">
    <div
      class="container"
      :style="{ width: collapsed ? 0 : width }"
    >
      <div
        class="spacer"
        :style="{ width }"
      >
        <slot />
      </div>
    </div>
    <button
      :title="collapsed ? title: null"
      @click="collapsed = !collapsed"
    >
      <SwitchIcon :style="{ transform: collapsed ? 'scaleX(-1)': null }" />
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
    --icon-size: 10;

    stroke: var(--knime-masala);
    transition: transform 0.3s ease;
  }
}
</style>
