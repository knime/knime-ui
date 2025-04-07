import CopyIcon from "@knime/styles/img/icons/copy.svg";

import { getToastsProvider } from "@/plugins/toasts";

import { copyErrorReportToClipboard } from "./copyErrorReportToClipboard";

type ProblemDetails = {
  title: string;
  details?: Array<string>;
  [key: string]: any; // allow custom extensions
};

const $toast = getToastsProvider();

const formatToastMessage = ({
  errorHint,
  problemDetails,
}: {
  errorHint?: string;
  problemDetails: ProblemDetails;
}): string => {
  const message: Array<string> = [];
  message.push(problemDetails.title);

  if (errorHint) {
    message.push(" ", errorHint);
  }
  if (problemDetails.details && problemDetails.details.length > 0) {
    message.push(
      `\n\nDetails:\n ${problemDetails.details
        .map((s) => `  - ${s}`)
        .join("\n")}`,
    );
  }

  return message.join("");
};

export const showProblemDetailsErrorToast = ({
  headline,
  errorHint,
  problemDetails,
  error,
  copyToClipboard = false,
}: {
  headline?: string;
  errorHint?: string;
  problemDetails: ProblemDetails;
  error?: unknown; // so one doesn't have to pass a caught exception using "as Error"
  copyToClipboard?: boolean;
}) => {
  return $toast.show({
    headline,
    message: formatToastMessage({ errorHint, problemDetails }),
    type: "error",
    autoRemove: false,
    ...(copyToClipboard
      ? {
          buttons: [
            {
              callback: () => {
                copyErrorReportToClipboard({
                  errorContext: headline,
                  problemDetails,
                  error,
                });
              },
              text: "Copy error report to clipboard",
              icon: CopyIcon,
            },
          ],
        }
      : {}),
  });
};
