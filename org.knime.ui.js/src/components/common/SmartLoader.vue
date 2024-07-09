<script lang="ts" setup>
import {
  toRef,
  type CSSProperties,
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
} from "vue";

import ReloadIcon from "webapps-common/ui/assets/img/icons/reload.svg";
import { createStaggeredLoader } from "@/util/createStaggeredLoader";

export interface SmartLoaderProps {
  loading?: boolean;
  text?: string;
  /**
   * determines the loader's appearance
   */
  displayMode?: "fullscreen" | "floating";
  /**
   * whether to use standard load without delay, or a staggered loader
   */
  loadingMode?: "stagger" | "normal";
  /**
   * number of stages to stagger for.
   */
  staggerStageCount?: 1 | 2;
}

const props = withDefaults(defineProps<SmartLoaderProps>(), {
  loading: false,
  text: "Loading…",
  displayMode: "fullscreen",
  loadingMode: "stagger",
  staggerStageCount: 2,
});

const showLoader = ref<boolean>();
const isTextShown = ref<boolean>();
const isIconShown = ref<boolean>();
const setLoading = ref<(value: boolean) => any>();

const overlayStyles = computed<CSSProperties>(() => {
  const positionMap = {
    fullscreen: "fixed",
    floating: "static",
  } as const;

  const zIndexMap = {
    fullscreen: "99",
    floating: "initial",
  };

  return {
    position: positionMap[props.displayMode],
    zIndex: zIndexMap[props.displayMode],

    // add the initial dimensions as css properties for later usage in the styles
    "--initial-width": "100%",
    "--initial-height": "100%",
    "--smartloader-z-index": 99,
  };
});

const loader = ref<HTMLElement>();

const focus = () => {
  nextTick(() => {
    loader.value?.focus();
  });
};

const useNormalLoadingMode = () => {
  setLoading.value = (value) => {
    showLoader.value = value;
    focus();
    isIconShown.value = true;
    isTextShown.value = true;
  };
};

const useStaggerLoadingMode = () => {
  const noop = () => {};

  setLoading.value = createStaggeredLoader({
    firstStageCallback: () => {
      showLoader.value = true;
      focus();
      isIconShown.value = true;
    },
    secondStageCallback:
      props.staggerStageCount === 2
        ? () => {
            isTextShown.value = true;
          }
        : noop,
    resetCallback: () => {
      showLoader.value = false;
      isTextShown.value = false;
      isIconShown.value = false;
    },
  });
};

const setupLoader = () => {
  const loadingModeHandlers = {
    normal: useNormalLoadingMode,
    stagger: useStaggerLoadingMode,
  };

  loadingModeHandlers[props.loadingMode]();

  setLoading.value?.(true);
};

const teardownLoader = () => {
  setLoading.value?.(false);
  setLoading.value = () => {};
};

onMounted(() => {
  // add the watcher on mounted so the immediate watcher can accessing refs,
  // before mounting component this would result in errors
  watch(
    toRef(props, "loading"),
    (loading) => {
      if (loading) {
        setupLoader();
      } else {
        teardownLoader();
      }
    },
    { immediate: true },
  );
});
</script>

<template>
  <div :style="overlayStyles">
    <div
      v-show="showLoader"
      ref="loader"
      class="loader"
      :class="displayMode"
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

  &.floating {
    background: var(--smartloader-bg, var(--knime-masala));
    min-width: 150px;
    height: 60px;
    position: fixed;
    left: var(--smartloader-floating-pos-left, 60px);
    bottom: var(--smartloader-floating-pos-bottom, 60px);
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
