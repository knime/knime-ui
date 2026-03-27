import {
  type ComputedRef,
  type Ref,
  computed,
  onMounted,
  onUnmounted,
  ref,
} from "vue";

const COUNTDOWN_VISIBLE_THRESHOLD = 15;

type UseInquiryLifecycleParams = {
  /** Timeout in seconds as provided by the inquiry entity. */
  timeoutSeconds: number | undefined;
  /** Called when the countdown timer reaches zero. */
  onTimeout: () => void;
  /** Called when the component unmounts before the inquiry has been resolved. */
  onUnmountUnresolved: () => void;
};

type UseInquiryLifecycleReturn = {
  /** Whether the inquiry has already been resolved (guards against double-submit). */
  isResolved: Readonly<Ref<boolean>>;
  /** Remaining seconds on the countdown timer. */
  remainingSeconds: Readonly<Ref<number>>;
  /** True when the countdown is in its visible range (last 15 seconds). */
  isCountdownVisible: ComputedRef<boolean>;
  /**
   * Resolve the inquiry once. If already resolved, returns `false` and does
   * not call {@link fn}. Otherwise marks the inquiry as resolved, stops the
   * timer, calls {@link fn}, and returns `true`.
   */
  resolveOnce: (fn: () => void | Promise<void>) => boolean;
};

/**
 * Shared lifecycle management for inquiry cards (Choice and Permission).
 *
 * Encapsulates the countdown timer, the one-shot resolution guard, and the
 * mount/unmount hooks that both card types need.
 */
export function useInquiryLifecycle({
  timeoutSeconds,
  onTimeout,
  onUnmountUnresolved,
}: UseInquiryLifecycleParams): UseInquiryLifecycleReturn {
  const isResolved = ref(false);
  const remainingSeconds = ref(timeoutSeconds ?? 0);
  let intervalId: number | null = null;

  const stopTimer = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  const resolveOnce = (fn: () => void | Promise<void>): boolean => {
    if (isResolved.value) {
      return false;
    }
    isResolved.value = true;
    stopTimer();
    fn();
    return true;
  };

  const isCountdownVisible = computed(
    () =>
      timeoutSeconds !== undefined &&
      remainingSeconds.value > 0 &&
      remainingSeconds.value <= COUNTDOWN_VISIBLE_THRESHOLD,
  );

  onMounted(() => {
    if (timeoutSeconds === undefined) {
      return;
    }
    intervalId = window.setInterval(() => {
      remainingSeconds.value -= 1;
      if (remainingSeconds.value <= 0) {
        resolveOnce(onTimeout);
      }
    }, 1000);
  });

  onUnmounted(() => {
    resolveOnce(onUnmountUnresolved);
    // Safety net: stop the timer even if already resolved (e.g. resolved on
    // the same tick as unmount, before clearInterval ran).
    stopTimer();
  });

  return {
    isResolved,
    remainingSeconds,
    isCountdownVisible,
    resolveOnce,
  };
}
