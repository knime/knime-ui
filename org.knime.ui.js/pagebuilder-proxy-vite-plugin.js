import fs from "node:fs";
import path from "node:path";

const pluginLog = (message) => {
  // eslint-disable-next-line no-console
  console.log(`[PageBuilder Development Proxy]: ${message}`);
};

export const pagebuilderProxyVitePlugin = (
  relativePathToPageBuilderModule,
) => ({
  name: "pagebuilder-module-proxy",
  configureServer(server) {
    if (!relativePathToPageBuilderModule) {
      pluginLog(
        "relativePathToPageBuilderModule is not defined. Please provide a valid path.",
      );
      return;
    }

    const modulePath = path.resolve(__dirname, relativePathToPageBuilderModule);
    if (!fs.existsSync(modulePath)) {
      pluginLog(`Directory does not exist: ${modulePath}`);
      return;
    }

    server.middlewares.use("/pagebuilder-module", (req, res, next) => {
      if (!req.url || !req.url.endsWith("PageBuilderShadowApp.esm.js?import")) {
        pluginLog(
          `Unexpected request. Only dynamical import of the PageBuilderModule is allowed: ${req.url}`,
        );
        return next();
      }

      const filePath = path.join(modulePath, req.url.replace("?import", ""));

      if (!fs.existsSync(filePath)) {
        pluginLog(
          `File not found: ${filePath}. Have you built the pagebuilder module?`,
        );
        res.statusCode = 404;
        res.end("Not Found");
        return next();
      }

      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);

      readStream.on("error", (error) => {
        pluginLog(error.message);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      });

      pluginLog(`Serving file: ${filePath}`);
    });

    pluginLog(
      `Middleware registered for /pagebuilder-module. Will use local module at: ${modulePath}`,
    );
  },
});
