<script>
import ReloadIcon from 'webapps-common/ui/assets/img/icons/reload.svg';

/**
 * Returns function that when called will execute the given callbacks
 * after a specified delay. The calls are staggered, meaning the second callback will be
 * executed only after the 1st one has been called and the corresponding delay has passed
 *
 * @param {Object} arg
 * @param {Function} arg.initialCallback callback fn that executes without delay at the start
 * @param {Function} arg.firstStageCallback callback fn that executes after the 1st stage's delay
 * @param {Function} arg.secondStageCallback callback fn that executes after the 1st callback and the 2nd stage's delay
 * @param {Function} arg.resetCallback callback fn that executes when the loader's value is false. It clears the
 * internal timer
 *
 * @returns {Function} The function to start the staggered call
 */
const createStaggeredLoader = ({
    initialCallback = () => {},
    firstStageCallback = () => {},
    secondStageCallback = () => {},
    resetCallback = () => {},
    options = {}
}) => {
    const DEFAULT_STAGE1_DELAY = 1000;
    const DEFAULT_STAGE2_DELAY = 2500;
    
    const stage1Delay = options.stage1Delay || DEFAULT_STAGE1_DELAY;
    const stage2Delay = options.stage2Delay || DEFAULT_STAGE2_DELAY;

    let internalTimer = null;

    const startLoader = (value) => {
        if (!value) {
            clearTimeout(internalTimer);
            resetCallback();
            return;
        }

        initialCallback();

        internalTimer = setTimeout(() => {
            firstStageCallback();

            internalTimer = setTimeout(() => {
                secondStageCallback();
            }, stage2Delay);
        }, stage1Delay);
    };

    return startLoader;
};

export default {
    components: {
        ReloadIcon
    },

    props: {
        loading: {
            type: Boolean,
            default: false
        },

        text: {
            type: String,
            default: 'Loading…'
        },
        /**
         * @typedef SmartLoaderConfig
         * @property {'relative' | 'fixed'} [position] determines the loader's position
         * @property {'stagger' | 'normal'} [loadingMode] whether to use standard load without delay, or a staggered
         * loader
         * @property {Number} [staggerStageCount] number of stages to stagger for (1 or 2)
         * @property {Boolean} [transparent] whether to use a transparent loader. Using this will make the loader
         * fallback to 'fixed' position regardless of the provided `position` property
        */
        /**
         * Configuration object for the loader
         *
         * @type {import('vue').PropOptions<SmartLoaderConfig>}
         */
        config: {
            type: Object,
            default: () => ({})
        }
    },

    data() {
        return {
            showOverlay: false,
            isTextShown: false,
            isIconShown: false,
            setLoading: () => {}
        };
    },

    watch: {
        loading: {
            handler(loading) {
                if (loading) {
                    this.setupLoader();
                } else {
                    this.teardownLoader();
                }
            }
        }
    },

    mounted() {
        // setup loader on mounted instead of using an immediate watcher because accessing refs
        // before mounting component would result in errors
        if (this.loading) {
            this.setupLoader();
        }
    },

    methods: {
        setupLoader() {
            const { position = 'relative', loadingMode = 'stagger', transparent = false } = this.config;

            if (transparent) {
                this.useTransparentOverlay();
                return;
            }

            const positionHandlers = {
                fixed: this.handleFixedPosition,
                relative: this.handleRelativePosition
            };

            const loadingModeHandlers = {
                normal: this.normalLoadingMode,
                stagger: this.staggerLoadingMode
            };

            positionHandlers[position]();
            loadingModeHandlers[loadingMode]();
            
            this.setLoading(true);
        },

        teardownLoader() {
            this.setLoading(false);
            this.setLoading = () => {};
        },

        useTransparentOverlay() {
            const loadingOverlay = this.$refs.loadOverlay;
            loadingOverlay.style.background = 'transparent';
            loadingOverlay.style.cursor = 'wait';

            // always use fixed position for the transparent option
            this.handleFixedPosition();
            this.setLoading = (value) => {
                this.showOverlay = value;
            };
            this.setLoading(true);
        },

        handleFixedPosition() {
            const loadingOverlay = this.$refs.loadOverlay;

            loadingOverlay.style.position = 'fixed';
            loadingOverlay.style.width = '100vw';
            loadingOverlay.style.height = '100vh';
        },

        handleRelativePosition() {
            const getDimensions = () => {
                const [firstElementChild] = this.$slots.default || [];

                // match the initialDimensions if no slot child is found
                if (!firstElementChild) {
                    return {
                        height: this.config.initialDimensions?.height || '100%',
                        width: this.config.initialDimensions?.width || '100%'
                    };
                }

                return {
                    width: '100%',
                    height: '100%'
                };
            };

            const { width, height } = getDimensions();
          
            const loadingOverlay = this.$refs.loadOverlay;
            loadingOverlay.style.position = 'absolute';
            loadingOverlay.style.minHeight = height;
            loadingOverlay.style.width = width;
        },

        normalLoadingMode() {
            this.setLoading = (value) => {
                this.showOverlay = value;
                this.isIconShown = true;
                this.isTextShown = true;
            };
        },

        staggerLoadingMode() {
            const { staggerStageCount = 2 } = this.config;
            const noop = () => {};

            this.setLoading = createStaggeredLoader({
                firstStageCallback: () => {
                    this.showOverlay = true;
                    this.isIconShown = true;
                },
                secondStageCallback: staggerStageCount === 2
                    ? () => {
                        this.isTextShown = true;
                    }
                    : noop,
                resetCallback: () => {
                    this.showOverlay = false;
                    this.isTextShown = false;
                    this.isIconShown = false;
                }
            });
        }
    }
};
</script>

<template>
  <div
    :style="{
      position: config.transparent ? 'fixed' : (config.position || 'relative'),
      zIndex: config.position === 'fixed' ? 99 : 'initial'
    }"
  >
    <div
      v-show="showOverlay"
      ref="loadOverlay"
      class="loader"
      tabindex="0"
    >
      <ReloadIcon v-if="isIconShown" />
      <span
        v-if="isTextShown"
        class="text"
      >{{ text }}</span>
    </div>
    <slot />
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
  background: var(--smartloader-overlay-bg, rgba(255 255 255 / 70%));
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  z-index: 99;

  & svg {
    @mixin svg-icon-size var(--smartloader-icon-size, 50);

    stroke: var(--smartloader-icon-color, var(--knime-masala));
    animation: spin 2s linear infinite;
  }

  & .text {
    color: var(--knime-masala);
    min-height: 20px;
    font-size: 16px;
  }
}
</style>
