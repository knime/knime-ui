/* eslint-disable @typescript-eslint/no-explicit-any */
let scriptInjected = false;

export function injectPendoScript(apiKey: string) {
  if (scriptInjected || typeof window === "undefined") {
    return;
  }
  // script from setup page
  scriptInjected = true;
  (function (apiKeyParam) {
    (function (p: any, e: Document, n: string, d: string, o?: any) {
      o = p[d] = p[d] || {};
      o._q = o._q || [];
      const v = [
        "initialize",
        "identify",
        "updateOptions",
        "pageLoad",
        "track",
      ];
      for (let w = 0, x = v.length; w < x; ++w) {
        (function (m) {
          o[m] =
            o[m] ||
            function () {
              o._q[m === v[0] ? "unshift" : "push"](
                // eslint-disable-next-line prefer-rest-params
                [m].concat([].slice.call(arguments, 0)),
              );
            };
        })(v[w]);
      }
      const y = e.createElement(n);
      // @ts-expect-error async doesnt exist on HTMLElement
      y.async = !0;
      // @ts-expect-error src doesnt exist on HTMLElement
      y.src = `https://cdn.eu.pendo.io/agent/static/${apiKeyParam}/pendo.js`;
      const z = e.getElementsByTagName(n)[0];
      z.parentNode?.insertBefore(y, z);
    })(window, document, "script", "pendo");
  })(apiKey);
}
