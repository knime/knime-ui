<script>
import { mapState } from 'vuex';
import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';

const FIRST_LOADER_TIMEOUT_MS = 1000;
const SECOND_LOADER_TIMEOUT_MS = 2500;

export default {
    components: {
        ReloadIcon
    },

    data() {
        return {
            text: '',
            activeTimer: null,
            isIconShown: false
        };
    },

    computed: {
        ...mapState('application', ['isBusy'])
    },

    watch: {
        isBusy(isBusy) {
            if (!isBusy) {
                clearTimeout(this.activeTimer);
                this.resetState();
                return;
            }

            this.activeTimer = setTimeout(() => {
                this.isIconShown = true;

                this.activeTimer = setTimeout(() => {
                    this.text = 'Loading…';
                }, SECOND_LOADER_TIMEOUT_MS);
            }, FIRST_LOADER_TIMEOUT_MS);
        }
    },

    methods: {
        resetState() {
            this.text = null;
            this.activeTimer = null;
            this.isIconShown = false;
        }
    }
};
</script>

<template>
  <div
    v-if="isBusy"
    class="loader"
  >
    <ReloadIcon v-if="isIconShown" />
    <span class="text">{{ text }}</span>
  </div>
</template>

<style lang="postcss" scoped>
@import "@/assets/mixins.css";

@keyframes spin {
  100% {
    transform: rotate(-360deg);
  }
}

.loader {
  width: 100vw;
  height: calc(100vh);
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  z-index: 99;
  position: fixed;

  & svg {
    @mixin svg-icon-size 50;
    animation: spin 2s linear infinite;
  }

  & .text {
    color: var(--knime-masala);
    min-height: 20px;
    font-size: 16px;
  }
}
</style>
