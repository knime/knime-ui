<script lang="ts">
import { defineComponent, type PropType, type CSSProperties } from "vue";

import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import type { GlobalLoaderConfig } from "@/store/application/globalLoader";
import { createStaggeredLoader } from "@/util/createStaggeredLoader";

const DISPLAY_MODES = Object.freeze({
  fullscreen: "fullscreen",
  transparent: "transparent",
  localized: "localized",
  toast: "toast",
});

const LOADING_MODES = Object.freeze({
  normal: "normal",
  stagger: "stagger",
});

const DEFAULTS = Object.freeze({
  displayMode: DISPLAY_MODES.localized,
  loadingMode: LOADING_MODES.stagger,
  staggerStageCount: 2,
});

type ComponentData = {
  DEFAULTS: typeof DEFAULTS;
  showLoader: boolean;
  isTextShown: boolean;
  isIconShown: boolean;
  setLoading: (value: boolean) => any;
};

export default defineComponent({
  components: {
    ReloadIcon,
  },

  props: {
    loading: {
      type: Boolean,
      default: false,
    },

    text: {
      type: String,
      default: "Loading…",
    },

    config: {
      type: Object as PropType<GlobalLoaderConfig>,
      default: () => ({}) as GlobalLoaderConfig,
    },
  },

  data(): ComponentData {
    return {
      DEFAULTS,
      showLoader: false,
      isTextShown: false,
      isIconShown: false,
      setLoading: () => {},
    };
  },

  computed: {
    overlayStyles(): CSSProperties {
      const { displayMode = DEFAULTS.displayMode } = this.config;

      const positionMap = {
        [DISPLAY_MODES.fullscreen]: "fixed",
        [DISPLAY_MODES.localized]: "relative",
        [DISPLAY_MODES.transparent]: "fixed",
        [DISPLAY_MODES.toast]: "static",
      } as const;

      const zIndexMap = {
        [DISPLAY_MODES.fullscreen]: "99",
        [DISPLAY_MODES.localized]: "initial",
        [DISPLAY_MODES.transparent]: "initial",
        [DISPLAY_MODES.toast]: "initial",
      };

      const getDimensions = () => {
        const [firstElementChild] = this.$slots.default?.() || [];

        // match the initialDimensions if no slot child is found
        if (!firstElementChild) {
          return {
            height: this.config.initialDimensions?.height || "100%",
            width: this.config.initialDimensions?.width || "100%",
          };
        }

        return {
          width: "100%",
          height: "100%",
        };
      };

      const { width, height } = getDimensions();

      return {
        position: positionMap[displayMode],
        zIndex: zIndexMap[displayMode],

        // add the initial dimensions as css properties for later usage in the styles
        "--initial-width": width,
        "--initial-height": height,
        "--smartloader-z-index": 99,
      };
    },
  },

  watch: {
    loading: {
      handler(loading) {
        if (loading) {
          this.setupLoader();
        } else {
          this.teardownLoader();
        }
      },
    },
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
        loadingMode = DEFAULTS.loadingMode,
      } = this.config;

      if (displayMode === "transparent") {
        this.setLoading = (value) => {
          this.showLoader = value;
        };
        this.setLoading(true);
        return;
      }

      const loadingModeHandlers = {
        normal: this.useNormalLoadingMode,
        stagger: this.useStaggerLoadingMode,
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
        (this.$refs.loader as HTMLElement).focus();
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
        secondStageCallback:
          staggerStageCount === 2
            ? () => {
                this.isTextShown = true;
              }
            : noop,
        resetCallback: () => {
          this.showLoader = false;
          this.isTextShown = false;
          this.isIconShown = false;
        },
      });
    },
  },
});
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
      <span v-if="isTextShown" class="text">{{ text }}</span>
    </div>
    <slot v-if="!showLoader" />
  </div>
</template>

<style lang="postcss" scoped>
@import url("@/assets/mixins.css");

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
  z-index: var(--smartloader-z-index);

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

  &.fullscreen,
  &.transparent {
    position: fixed;
    width: 100vw;
    height: 100vh;
  }

  &.fullscreen {
    background: var(--smartloader-bg, rgba(255 255 255 / 70%));
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
    height: 200px;
  }

  &.toast {
    background: var(--smartloader-bg, var(--knime-masala));
    min-width: 150px;
    height: 60px;
    position: fixed;
    left: var(--smartloader-toast-pos-left, 60px);
    bottom: var(--smartloader-toast-pos-bottom, 60px);
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 10px;
    padding: 20px;
    border-radius: 2px;
    box-shadow: var(--shadow-elevation-2);

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
