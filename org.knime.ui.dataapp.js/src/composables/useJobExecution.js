import { computed, onBeforeUnmount, onBeforeUpdate } from "vue";
import { useStore } from "vuex";

import { wizardExecutionStates } from "@/config";

export const useJobExecution = () => {
  const store = useStore();

  const page = computed(() => {
    return store.state.wizardExecution.page;
  });
  const isFinished = computed(() => store.getters["wizardExecution/isFinished"]);
  const hasPreviousPage = computed(() => store.getters["wizardExecution/hasPreviousPage"]);
  const hasReport = computed(() => store.getters["wizardExecution/hasReport"]);
  const totalNotifications = computed(() => store.getters["notification/totalNotifications"]);

  const executionState = computed(() => {
    return page.value?.wizardExecutionState;
  });

  const showPageBuilder = computed(() => Boolean(page.value?.wizardPageContent));

  const isExecutionStateValid = computed(() => {
    // The second condition always returns true. Documented in:
    // https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/3302981822/Potential+Refactorings+for+Executions+and+Deployments
    return page.value && wizardExecutionStates[executionState.value] !== "undefined";
  });

  const isPageValid = computed(() => {
    return showPageBuilder.value && isExecutionStateValid.value;
  });

  const showResult = computed(() => {
    if (!isFinished.value) {
      return false;
    }
    // hide results with page content and no error messages

    return !showPageBuilder.value || executionState.value !== wizardExecutionStates.FINISHED;
  });

  const showProgress = computed(() =>
    [
      wizardExecutionStates.LOADING,
      wizardExecutionStates.EXECUTING,
      wizardExecutionStates.STOPPING,
      wizardExecutionStates.MISSING,
    ].includes(executionState.value),
  );

  const showControlBar = computed(() => {
    const noUserActionPossible = isFinished.value && !hasPreviousPage.value && !hasReport.value;
    const showControlBar = isPageValid.value && !noUserActionPossible;
    // make sure notifications are displayed above the control bar
    store.dispatch("notification/setWithFooter", {
      withFooter: showControlBar,
    });
    return showControlBar;
  });

  const showReport = computed(() => {
    if (!isFinished.value) {
      return false;
    }
    const disableReportPreview = import.meta.env.KNIME_DISABLE_REPORT_PREVIEW === "true";
    return !disableReportPreview && hasReport.value;
  });

  const notificationDetails = computed(() => {
    let details = "";
    let delimiter = "";

    if (!isExecutionStateValid.value) {
      details += `${delimiter}Job is in an unexpected state.`;
    }

    return isPageValid.value ? null : details;
  });

  /* Determine a reasonable bottom margin based on the minimum height of the WizardNavigation component and the
   number of currently displayed notifications. */
  const sectionStyles = computed(() => {
    // equal to the navigation bar min-height (70) + 5 * minimum notification height (56)
    const maxMargin = 350;
    const minNavHeight = 70;
    const minMessageHeight = 56;
    let marginBottomPx = minNavHeight;
    for (let i = 0; i < totalNotifications.value; i++) {
      marginBottomPx += minMessageHeight;
    }
    return `margin-bottom: ${Math.min(marginBottomPx, maxMargin)}px;`;
  });

  /**
   * Redirects to error or workflow page and shows an error alert.
   * @returns {undefined}
   */
  const handleErrors = (printDetails) => {
    consola.debug("job-exec hook failed. Displaying error.");
    let message = "A problem occurred. Please contact your team admin if the problem persists.";
    if (printDetails) {
      message += ` (${notificationDetails.value})`;
    }
    store.dispatch("error/setError", {
      hasError: true,
      message,
      details: notificationDetails,
    });
  };

  onBeforeUpdate(() => {
    consola.trace('job-exec "beforeUpdate" hook called');
    if (!isPageValid.value) {
      handleErrors();
    }
  });

  /**
   * Before component is unmounted make sure no data persists from job.
   * @returns {undefined}
   */
  onBeforeUnmount(() => {
    consola.debug('Page "job-exec" teardown and clear store.');
    store.dispatch("wizardExecution/clear", "job-exec");
    store.dispatch("wizardExecution/clearPageContentErrorNotifications");
  });

  return {
    isPageValid,
    showResult,
    showProgress,
    showPageBuilder,
    showReport,
    executionState,
    isExecutionStateValid,
    showControlBar,
    sectionStyles,
  };
};
