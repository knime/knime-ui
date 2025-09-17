export const isDevMode = import.meta.env.DEV;
export const jobPageTimeout = 0.25 * 1000; // 0.25 seconds; used for nextPage && previousPage requests
export const jobPollInterval = 0.5 * 1000; // 0.5 seconds
export const jobDataPollInterval = 5 * 1000; // 5 seconds; used for the global jobs data polling and session keep-alive

export const pageBuilderResources = [
  {
    name: "PageBuilder", // module name
    componentName: "PageBuilder", // top level component name
    url: import.meta.env.PAGEBUILDER_URL || "/org/knime/core/ui/pagebuilder/lib/PageBuilder.umd.js",
    backup: "/lib/PageBuilder.umd.js",
  },
];

// Supported wizardExecutionStates.
export const wizardExecutionStates = {
  LOADING: "LOADING",
  EXECUTING: "EXECUTING",
  INTERACTION_REQUIRED: "INTERACTION_REQUIRED",
  FINISHED: "EXECUTION_FINISHED",
  FINISHED_WITH_ERRORS: "EXECUTION_FAILED_WITH_CONTENT",
  FAILED: "EXECUTION_FAILED",
  NOT_EXECUTABLE: "NOT_EXECUTABLE",
  CANCELLED: "EXECUTION_CANCELLED",
  STOPPING: "STOPPING_EXECUTION", // used for error handling; frontend only
  MISSING: "MISSING_JOB", // used for error handling; frontend only
};

// Unsupported wizardExecutionStates and their error message details.
export const unsupportedExecutionStates = {
  EXECUTED: "The state of the workflow cannot be determined.", // deprecated; use INTERACTION_REQUIRED/FINISHED
  IDLE: "The workflow is not configured",
  DISCARDED: "Workflow has been discarded from the server", // likely not found in WebPortal (relates to Orphan Jobs)
  UNDEFINED: "The state of the workflow cannot be determined.",
  LOAD_ERROR: "There was a problem loading the workflow.",
};

// Job states mapped to their job list status.
export const jobStates = {
  [wizardExecutionStates.LOADING]: "Loading",
  CONFIGURED: "Interaction required",
  [wizardExecutionStates.EXECUTING]: "Running",
  EXECUTED: "Interaction required", // deprecated in favor of INTERACTION_REQUIRED or FINISHED
  [wizardExecutionStates.FINISHED]: "Success",
  [wizardExecutionStates.FINISHED_WITH_ERRORS]: "Success",
  [wizardExecutionStates.FAILED]: "Failed",
  [wizardExecutionStates.CANCELLED]: "Failed",
  [wizardExecutionStates.INTERACTION_REQUIRED]: "Interaction required",
  RUNNING: "Interaction required",
  IDLE: "Failed", // something happened to the underlying workflow which left it in an un-configured state.
  DISCARDED: "Failed",
  UNDEFINED: "Failed",
  LOAD_ERROR: "Failed",
  VANISHED: "Failed",
  NOT_EXECUTABLE: "Not executable",

  [undefined]: "Interaction required", // fallback job state
};

export const reportFormats = [
  ["PDF", "PDF"],
  ["HTML", "HTML"],
  ["DOCX", "Microsoft Word"],
  ["XLSX", "Microsoft Excel"],
  ["PPTX", "Microsoft PowerPoint"],
  ["ODP", "OpenOffice Presenter"],
  ["ODS", "OpenOffice Calc"],
  ["ODT", "OpenOffice Writer"],
  ["PS", "PostScript"],
];

export const defaultReportFormats = ["pdf", "html", "docx", "xlsx", "pptx"];
