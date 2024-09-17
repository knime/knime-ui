import { version } from "vue";

import { merge } from "lodash-es";

import { getToastsProvider } from "@/plugins/toasts";
import CopyIcon from "@knime/styles/img/icons/copy.svg";

type ProblemDetails = {
  title: string;
  details?: Array<string>;
  [key: string]: any; // allow custom extensions
};

const $toast = getToastsProvider();

const toEnumeratedObject = (obj) => {
  return Object.getOwnPropertyNames(obj).reduce((acc, cur) => {
    acc[cur] = obj[cur];
    return acc;
  }, {});
};

export const copyReportToClipboard = (data: object = {}) => {
  const general = {
    app: "KnimeUI",
    vueVersion: version,
    timestamp: new Date().toISOString(),
  };

  return navigator.clipboard.writeText(
    JSON.stringify(
      merge(general, data),
      // Error object's properties are non-enumerable, and would by default be omitted in the serialization
      (_, value) =>
        value instanceof Error ? toEnumeratedObject(value) : value,
      2,
    ),
  );
};

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

export const showErrorToast = ({
  id = "__ERROR_TOAST_ID",
  headline,
  errorHint,
  problemDetails,
  error,
  copyToClipboard = false,
}: {
  id?: string;
  headline?: string;
  errorHint?: string;
  problemDetails: ProblemDetails;
  error?: unknown; // so one doesn't have to pass a caught exception using "as Error"
  copyToClipboard?: boolean;
}) => {
  return $toast.show({
    id,
    headline,
    message: formatToastMessage({ errorHint, problemDetails }),
    type: "error",
    autoRemove: false,
    ...(copyToClipboard
      ? {
          buttons: [
            {
              callback: () => {
                copyReportToClipboard({
                  errorContext: headline,
                  problemDetails,
                  error,
                });
              },
              text: "Copy error to clipboard",
              icon: CopyIcon,
            },
          ],
        }
      : {}),
  });
};
