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

const DISPLAY_MODES = {
    fullscreen: 'fullscreen',
    transparent: 'transparent',
    localized: 'localized',
    toast: 'toast'
};

const LOADING_MODES = {
    normal: 'normal',
    stagger: 'stagger'
};

const DEFAULTS = Object.freeze({
    displayMode: DISPLAY_MODES.localized,
    loadingMode: LOADING_MODES.stagger,
    staggerStageCount: 2
});

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
         * @property {'fullscreen' | 'localized' | 'toast' | 'transparent'} [displayMode] determines the loader's appeareance
         * @property {'stagger' | 'normal'} [loadingMode] whether to use standard load without delay, or a staggered
         * loader
         * @property {Number} [staggerStageCount] number of stages to stagger for (1 or 2)
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
            DEFAULTS,
            showLoader: false,
            isTextShown: false,
            isIconShown: false,
            setLoading: () => {}
        };
    },

    computed: {
        overlayStyles() {
            const { displayMode = DEFAULTS.displayMode } = this.config;

            const positionMap = {
                [DISPLAY_MODES.fullscreen]: 'fixed',
                [DISPLAY_MODES.localized]: 'relative',
                [DISPLAY_MODES.transparent]: 'fixed'
            };

            const zIndexMap = {
                [DISPLAY_MODES.fullscreen]: '99',
                [DISPLAY_MODES.localized]: '99',
                [DISPLAY_MODES.transparent]: 'initial',
                [DISPLAY_MODES.toast]: 'initial'
            };

            const getDimensions = () => {
                const [firstElementChild] = this.$slots?.default || [];

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

            return {
                position: positionMap[displayMode],
                zIndex: zIndexMap[displayMode],

                // add the initial dimensions as css properties for later usage in the styles
                '--initial-width': width,
                '--initial-height': height
            };
        }
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
            const {
                displayMode = DEFAULTS.displayMode,
                loadingMode = DEFAULTS.loadingMode
            } = this.config;

            if (displayMode === 'transparent') {
                this.setLoading = (value) => {
                    this.showLoader = value;
                };
                this.setLoading(true);
                return;
            }

            const loadingModeHandlers = {
                normal: this.useNormalLoadingMode,
                stagger: this.useStaggerLoadingMode
            };
            
            loadingModeHandlers[loadingMode]();
            
            this.setLoading(true);
        },

        teardownLoader() {
            this.setLoading(false);
            this.setLoading = () => {};
        },

        focus() {
            this.$nextTick(() => {
                this.$refs.loader.focus();
            });
        },

        useNormalLoadingMode() {
            this.setLoading = (value) => {
                this.showLoader = value;
                this.focus();
                this.isIconShown = true;
                this.isTextShown = true;
            };
        },

        useStaggerLoadingMode() {
            const { staggerStageCount = DEFAULTS.staggerStageCount } = this.config;
            const noop = () => {};

            this.setLoading = createStaggeredLoader({
                firstStageCallback: () => {
                    this.showLoader = true;
                    this.focus();
                    this.isIconShown = true;
                },
                secondStageCallback: staggerStageCount === 2
                    ? () => {
                        this.isTextShown = true;
                    }
                    : noop,
                resetCallback: () => {
                    this.showLoader = false;
                    this.isTextShown = false;
                    this.isIconShown = false;
                }
            });
        }
    }
};
</script>

<template>
  <div :style="overlayStyles">
    <div
      v-show="showLoader"
      ref="loader"
      class="loader"
      :class="config.displayMode || DEFAULTS.displayMode"
      tabindex="-1"
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
  display: flex;
  outline: none;
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
    color: var(--smartloader-text-color, var(--knime-masala));
    min-height: 16px;
    font-size: 16px;
  }

  &.fullscreen, &.transparent {
    background: var(--smartloader-bg, rgba(255 255 255 / 70%));
    position: fixed;
    width: 100vw;
    height: 100vh;
  }

  &.transparent {
    background: transparent;
    cursor: wait;
  }

  &.localized {
    background: var(--smartloader-bg, rgba(255 255 255 / 70%));
    position: absolute;
    min-height: var(--initial-height);
    width: var(--initial-width);
  }
  
  &.toast {
    background: var(--smartloader-bg, var(--knime-masala));
    min-width: 150px;
    height: 60px;
    position: fixed;
    left: 60px;
    bottom: 40px;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    padding: 20px;
    border-radius: 2px;
    box-shadow: 0px 2px 10px rgba(130, 133, 134, 0.4);

    & .text {
      color: var(--smartloader-text-color, var(--knime-white));
    }

    & svg {
      @mixin svg-icon-size var(--smartloader-icon-size, 20);

      stroke: var(--smartloader-icon-color, var(--knime-white));
    }
  }
}
</style>
