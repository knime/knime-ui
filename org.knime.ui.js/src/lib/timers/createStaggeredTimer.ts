type StaggeredTimerParams = {
  /**
   * callback fn that executes without delay at the start
   */
  initialCallback?: () => any;
  /**
   * callback fn that executes after the 1st stage's delay
   */
  firstStageCallback?: () => any;
  /**
   * callback fn that executes after the 1st callback and the 2nd stage's delay
   */
  secondStageCallback?: () => any;
  /**
   * callback fn that executes when the loader's value is false. It clears the internal timer
   */
  resetCallback?: () => any;
  options?: {
    stage1Delay?: number;
    stage2Delay?: number;
  };
};

/**
 * Returns function that when called will execute the given callbacks
 * after a specified delay. The calls are staggered, meaning the second callback will be
 * executed only after the 1st one has been called and the corresponding delay has passed
 *
 * @param initialCallback callback fn that executes without delay at the start
 * @param firstStageCallback callback fn that executes after the 1st stage's delay
 * @param secondStageCallback callback fn that executes after the 1st callback and the 2nd stage's delay
 * @param resetCallback callback fn that executes when the loader's value is false. It clears the
 * internal timer
 *
 * @returns The function to start the staggered call
 */
export const createStaggeredTimer = ({
  initialCallback = () => {},
  firstStageCallback = () => {},
  secondStageCallback = () => {},
  resetCallback = () => {},
  options = {},
}: StaggeredTimerParams) => {
  const DEFAULT_STAGE1_DELAY = 1000;
  const DEFAULT_STAGE2_DELAY = 2500;

  const stage1Delay = options.stage1Delay ?? DEFAULT_STAGE1_DELAY;
  const stage2Delay = options.stage2Delay ?? DEFAULT_STAGE2_DELAY;

  let internalTimer: number;

  const setValue = (value: boolean) => {
    if (!value) {
      clearTimeout(internalTimer);
      resetCallback();
      return;
    }

    initialCallback();

    internalTimer = window.setTimeout(() => {
      firstStageCallback();

      internalTimer = window.setTimeout(() => {
        secondStageCallback();
      }, stage2Delay);
    }, stage1Delay);
  };

  return setValue;
};
