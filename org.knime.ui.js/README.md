# KNIME UI (Modern UI) -- org.knime.ui.js

This project contains the web frontend for the KNIME Analytics Platform.
The frontend is based on the [Vue.js] JavaScript framework.

# Development

### Prerequisites

- Install [Node.js][node], see version in [package.json](package.json)
- Configure your KNIME Analytics Platform to use the locally running UI

  - download the AP, e.g. from https://www.knime.com/nightly-build-downloads
  - add the following arguments to the `<knime-installation-folder>/knime.ini`

    | argument                                       | comment                                                                                                            |
    | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
    | `-Dorg.knime.ui.dev.mode=true`                 | Enables debugging the AP's browser (described in the [Debugging section](#section_debugging) of this README)       |
    | `-Dorg.knime.ui.dev.url=http://localhost:3000` | Makes the AP use KNIME UI served from localhost instead of using the resources bundled with the KNIME UI Extension |

### Install dependencies

```sh
pnpm install
```

## UI running in KNIME Analytics Platform

Simply run the development server

```sh
pnpm dev
```

and open KNIME Analytics Platform. The UI will be served from the dev server, including hot-reloading, so code changes will be visible in the app immediately.

## UI running in the browser

In addition to running inside the KNIME Analytics Platform, the new UI can also run in the browser:

1. Copy the contents of the `.env.example` file over to a `.env` file.
2. Adjust the value of the `VITE_BROWSER_DEV_WS_URL` variable to match the url and port of the running WSS server (as configured below).
3. Set `VITE_BROWSER_DEV_MODE` to `true`, otherwise the `VITE_BROWSER_DEV_WS_URL` variable will have no effect.

Then follow the steps below, either with the nightly build or Eclipse SDK.

When you're done, run `pnpm dev` and you can open the app in the browser under `http://localhost:3000`

### Option 1: AP nightly build

This is the easiest setup and perfect if you only want to work on the workflow editing UI. You first need to:

- Open the nightly build and install the KNIME extension called `Remote Workflow Editor for Executor`.
- Create a `workflowContext.yaml` somewhere in your system. In this file you need to store a KNIME Hub application password (go to `https://hubdev.knime.com/<YOUR_HUBDEV_USER>/settings/application-passwords`) and a space id. This information will be used so that the Space Explorer can connect to that space in the Hub. Do note that the space id must start with a `*` character.

  ```
  spaceId: "*<SPACE_ID>"
  applicationPasswordID: "XXX"
  applicationPassword: "XXX"
  ```

Then you can run the nightly in a "headless" mode, which will simply keep it running in the background with a websocket server which knime-ui will connect to:

On Linux / Window (WSL):

```
./knime -nosplash -consoleLog -application com.knime.gateway.executor.GATEWAY_DEV_SERVER_APPLICATION -port=7000 -workflowContextConfig="/path/to/workflowContext.yaml" -workflowDir="/path/to/a/workflow"
```

On Mac:

```
"/Applications/KNIME 5.x.x....app/Contents/MacOS/knime" -nosplash -consoleLog -application com.knime.gateway.executor.GATEWAY_DEV_SERVER_APPLICATION -port=7001 -workflowContextConfig="/Users/<USER>/.../workflowContext.yaml" -workflowDir="/Users/<USER>/path/to/workflow"
```

Note: using port 7001 as port 7000 is already used on Mac.

### Option 2: Eclipse SDK

To use this mode, you need to have the proper Eclipse setup, as well as doing a couple extra steps. You can see more information on [this page][debugapbrowser].

### Option 3: Loaded in iframe via [AP-loader](https://bitbucket.org/KNIME/knime-hub-ap-loader/src/master/)

Only relevant if you need to develop for both knime-ui and the ap-loader application: in addition to the above, you need to set in your `.env` file:

- `VITE_BROWSER_DEV_MODE_EMBEDDED` variable to `true`
- `VITE_APP_PORT` to `3001` (because ap-loader will be running on port 3000)

## Git hooks

To set up hooks via [husky] on the repository (recommended for a frontend-focused development setup) you can run the following npm script:

```sh
pnpm run add-husky
```

If working on a fullstack setup (backend & frontend) you might want to opt-out and instead fallback to using the global hooks approach (See [here](https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/3023077413/Git+Setup#Set-up-commit-message-template)). This is because husky will intervene with the global hooks and takeover, meaning that if you have other global hooks set up for the repo then those won't work.

When committing your changes, a couple of commit hooks will run via [husky].

- `pre-commit` hook to lint and format the changes in your stage zone (via [lintstaged])
- `prepare-commit-msg` hook to format your commit message to conform with the required format by KNIME. In order for this to work you must set environment variables with your Atlassian email and API token. Refer to [webapps-common/scripts/README.md](webapps-common/scripts/README.md) for more information.

## Testing

### Running unit tests

This project contains unit tests written with [vitest].
They are run with

```sh
pnpm run test:unit
```

During development, you can use `pnpm run test:unit -- --watch` to have the unit tests run automatically whenever a
source file changes.

You can generate a coverage report with

```sh
pnpm run coverage
```

The output can be found in the `test-results` folder. It contains a browseable html report as well as raw coverage data in
[LCOV] and [Clover] format, which can be used in analysis software (SonarQube, Jenkins, …).

### Running E2E & performance tests

This project contains UI E2E and performance tests written with [Playwright]:

```sh
pnpm run test:e2e
pnpm run test:performance
```

Read more in [e2e/README.md](e2e/README.md).

<a id="section_debugging"></a>

## Debugging

Make sure you have `-Dorg.knime.ui.dev.mode=true` in your `<knime-installation-folder>/knime.ini`.

You can open the DevTools by clicking the `Inspect Code` button in the AP header toolbar.

An alternative way to do it would be:

1. In your system Chrome browser, go to `chrome://inspect`
2. Under "Devices" -> "Discover network targets", click the `Configure...` button
3. Add `localhost:8888` and close the popup
4. Under "Remote Target", you can click `inspect` to open the DevTools.

### Enable [Consola](https://www.npmjs.com/package/consola) logging

Set the `KNIME_LOG_LEVEL` item to `verbose` in the `localStorage` and then refresh the AP.

Alternatively, set the `VITE_LOG_LEVEL` env variable to `verbose` in the `.env` file and then restart the dev server and restart the AP.

This will enable detailed logs in the DevTools Console.

## Running security audit

pnpm provides a check against known security issues of used dependencies. In most cases it is sufficient to only check
dependencies that are used in production. Run it by calling

```sh
pnpm audit --prod
```

## Build production version

Run the JS production build via:

```sh
pnpm run build
```

This will also run the `type-check` step to ensure there are no TypeScript errors in the codebase. The output build will be placed in a `/dist` folder in the root of the JS repository

[vue.js]: https://vuejs.org/
[node]: https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/905281540/Node.js+Installation
[vitest]: https://vitest.dev/
[lcov]: https://github.com/linux-test-project/lcov
[clover]: http://openclover.org/
[Playwright]: https://playwright.dev/
[Installation guide]: https://docs.knime.com/latest/analytics_platform_installation_guide/index.html#_configuration_settings_and_knime_ini_file
[husky]: https://www.npmjs.com/package/husky
[lintstaged]: https://github.com/okonet/lint-staged
[debugapbrowser]: https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/3054895127/Debug+KNIME+AP+Modern+UI+in+browser+w+Eclipse+back+end
