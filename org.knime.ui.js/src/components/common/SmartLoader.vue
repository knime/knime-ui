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
            document.body.focus();
        },

        useTransparentOverlay() {
            const loadingWrapper = this.$refs.loadOverlay;
            loadingWrapper.style.background = 'transparent';
            loadingWrapper.style.cursor = 'wait';

            // always use fixed position for the transparent option
            this.handleFixedPosition();
            this.setLoading = (value) => {
                this.showOverlay = value;
            };
            this.setLoading(true);
        },

        handleFixedPosition() {
            const loadingWrapper = this.$refs.loadOverlay;

            loadingWrapper.style.position = 'fixed';
            loadingWrapper.style.width = '100vw';
            loadingWrapper.style.height = '100vh';
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
          
            const loadingWrapper = this.$refs.loadOverlay;
            loadingWrapper.style.position = 'absolute';
            loadingWrapper.style.minHeight = height;
            loadingWrapper.style.width = width;
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
    class="loader-wrapper"
    :style="{ position: config.position || 'relative' }"
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

.loader-wrapper {
  z-index: 99;
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
