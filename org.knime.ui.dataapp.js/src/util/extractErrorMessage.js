/**
 * Utility function which can check the failed error response from an HTTP request for content type and
 * empty data and provide a default error message if either of these two conditions exist.
 *
 * @param {Object} errorResponse - the failed server response.
 * @param {String} defaultMessage - optional default message to be used if none can be extracted from errorResponse.
 * @param {String} [errorResponse.data] - optional response data from the failed server error response.
 * @param {Object} [errorResponse.headers] - optional response headers from the failed server error response.
 * @param {String} [errorResponse.statusText] - optional response type from the failed server response headers.
 * @param {String} [errorResponse.headers['content-type']] - optional response type from the failed server response headers.
 * @returns {String} - the message extracted from the server error provided with HTML and empty data removed.
 */
export default ({ data, headers, statusText }, defaultMessage = null) => {
  // Remove html from error data.
  if (
    headers &&
    headers["content-type"] &&
    headers["content-type"].toLowerCase().includes("html")
  ) {
    data = statusText;
  }
  // Provide default if statusText is missing or data is empty.
  if (!data) {
    data = defaultMessage || "Something went wrong.";
  }
  return data;
};
