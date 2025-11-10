# KNIME UI -- org.knime.ui.js

This project contains the web frontend for the KNIME Analytics Platform.
The frontend is based on the [Vue.js] JavaScript framework.

# Development

Install [Node.js][node], see version in [package.json](package.json)

## Install dependencies

```sh
pnpm install
```

## Run the development server

```sh
pnpm dev
```

This will start a Vite server supplying the KNIME UI Vue application on
port 3000 (by default).

This includes hot-reloading, so code changes will be visible in the app
immediately.

The UI can be loaded in either the "Desktop AP" (the standalone desktop
application) or in your web browser of choice.

---

## Option 1: UI running in Desktop AP

You will need to start and instance of the KNIME Analytics Platform and
configure it so that it accesses the UI served from your local development
server.

Such an instance can be a normal KNIME Analytics Platform installation (such
as e.g. a nightly build, or started from a development environment ("Eclipse
SDK"). In both cases, this amounts to starting an Eclipse RCP Application
which includes an embedded browser that displays the UI.

```
 ┌─────────────────────────────────────┐
 │       Eclipse RCP Application       │
 │ org.knime.product.KNIME_APPLICATION │
 │                                     │
 │     ┌─────────────────────────┐     │
 │     │                         │     │
 │     │         Backend         │     │
 │     │                         │     │
 │     └───────────┬▲────────────┘     │
 │   ┌─────────────────────────────┐   │      ┌─────────────────────────┐
 │   │   Eclipse RCP Workbench UI  │   │      │     Vite Dev Server     │
 │   │             ││              │   │      │ ┌─────────────────────┐ │
 │   │ ┌───────────▼└────────────┐ │   │      │ │                     │ │
 │   │ │       CEF Browser       └─┼───┼──────┼─►  KNIME UI Frontend  │ │
 │   │ │ Equo Comm / Middleware  ◄─┼───┼──────┼─┐   Vue Application   │ │
 │   │ │                         │ │   │      │ │                     │ │
 │   └─────────────────────────────┘   │      │ └─────────────────────┘ │
 └─────────────────────────────────────┘      └─────────────────────────┘
```

In both cases, you need to apply the following configuration as Java system
properties to the application:

| argument                                       | comment                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `-Dorg.knime.ui.dev.mode=true`                 | Enables debugging the AP's browser (described in the [Debugging section](#section_debugging) of this README)       |
| `-Dorg.knime.ui.dev.url=http://localhost:3000` | Makes the AP use KNIME UI served from localhost instead of using the resources bundled with the KNIME UI Extension |

### Configuring a KNIME Analytics Platform installation

Add the arguments to the `<knime-installation-folder>/knime.ini` file. For
more information see [this page][debugap].

### Configuring an instance started from development environment

Set the system properties in the IDE's run configuration.

---

## Option 2: UI running in the browser

In this setting, the Backend (i.e the Executor) and the browser displaying
the frontend are separate components and must not necessarily be running
on the same machine. Instead of invoking the "Desktop AP" RCP Application,
you start a different kind of application that provides access to the
backend via a websocket server.

```
 ┌─────────────────────────────────────┐
 │      Eclipse RCP Application        │
 │ org.knime.gateway.executor.\        │  <- started either as AP build (e.g. a nightly build)
 │      GATEWAY_DEV_SERVER_APPLICATION │     or from IDE in development setup
 │     ┌─────────────────────────┐     │
 │     │                         │     │
 │     │         Backend         │     │
 │     │                         │     │
 │     └───────────┐▲────────────┘     │
 │                 ││                  │
 │   ┌─────────────▼└──────────────┐   │
 │   │      Websocket Server       │   │
 │   └─────────────┬▲──────────────┘   │
 └─────────────────┼┼──────────────────┘
                   ││
                   ││                        ┌─────────────────────────┐
                   ││                        │     Vite Dev Server     │
 ┌─────────────────▼└──────────────────┐     │ ┌─────────────────────┐ │
 │                                     │     │ │                     │ │
 │                                     ┼─────┼─►  KNIME UI Frontend  │ │
 │        Your Desktop Browser         ◄─────┼─┐   Vue Application   │ │
 │                                     │     │ │                     │ │
 │                                     │     │ └─────────────────────┘ │
 └─────────────────────────────────────┘     └─────────────────────────┘

```

### Enable access to Hub instances (Optional)

Both the backend and frontend will need to communicate with a Hub instance
for some features. In the production setting, this is facilitated implicitly
by virtue of the Executor and other Hub services being part of the same
cluster. In the development setting, we need to configure the base URL of a
hub instance and the credentials to access it.

Obtain an application password and ID via
`https://hubdev.knime.com/<YOUR_HUBDEV_USER>/settings/application-passwords`.

For the frontend, set the environment variables `VITE_HUB_API_URL`,
`VITE_HUB_AUTH_USER` and `VITE_HUB_AUTH_PASS` in `org.knime.js/.env`. See
the provided `.env.example` file for an example. This will setup a local vite
server proxy that can easily make requests to the hub without running into CORS issues.

### Configure and start the websocket server to provide the backend

Instruct the frontend where to reach the websocket server:

- Adjust the value of the `VITE_BROWSER_DEV_WS_URL` variable to match the url
  and port of the running websocket server.

Configure and start the websocket server: see instructions at [com.knime.
gateway.executor/README.md](https://bitbucket.org/KNIME/knime-com-gateway/src/master/com.knime.gateway.executor/README.md)

### Install and use the Vue.js dev tools browser extension (Optional)

- Install the browser extension [Vue.js dev tools](https://github.com/vuejs/vue-devtools)
- On your browser, open up the Web Developer Tools and switch to the Vue tab
- You can inspect components, see their state and inspect the Vuex store,
  which makes development so much easier now.

---

## Option 3: UI Loaded in iframe via [AP-loader](https://bitbucket.org/KNIME/knime-hub-ap-loader/src/master/)

Only relevant if you need to develop for both knime-ui and the ap-loader
application: in addition to the above, you need to set in your `.env` file:

- `VITE_BROWSER_DEV_MODE_EMBEDDED` variable to `true`
- `VITE_APP_PORT` to `3001` (because ap-loader will be running on port 3000)

---

## Git hooks

To set up hooks via [husky] on the repository (recommended for a frontend-focused development setup) you can run the following npm script:

```sh
pnpm run add-husky
```

If working on a fullstack setup (backend & frontend) you might want to opt-out and instead fallback to using the global hooks approach (See [here](https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/3023077413/Git+Setup#Set-up-commit-message-template)). This is because husky will intervene with the global hooks and takeover, meaning that if you have other global hooks set up for the repo then those won't work.

When committing your changes, a couple of commit hooks will run via [husky].

- `pre-commit` hook to lint and format the changes in your stage zone (via [lintstaged])
- `prepare-commit-msg` hook to format your commit message to conform with the required format by KNIME. In order for this to work you must set environment variables with your Atlassian email and API token. Refer to [webapps-common/scripts/README.md](webapps-common/scripts/README.md) for more information.

---

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

---

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
[debugap]: https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/1418854401/Debug+the+KNIME+AP+Modern+UI+inside+the+AP
