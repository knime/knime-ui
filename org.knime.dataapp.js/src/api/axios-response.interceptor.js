// Axios interceptor to provide access to response status codes and location header (if exists).
export const axiosResponseInterceptor = (response) => {
  response.data = response.data || {};
  response.data.status = response.status;
  if (response.headers && response.headers.location) {
    // needed e.g. for resource upload
    response.data.location = response.headers.location;
  }
  return response;
};
