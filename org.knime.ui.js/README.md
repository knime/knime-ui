# KNIME UI (Modern UI) -- org.knime.ui.js

This project contains the web frontend for the KNIME Analytics Platform.
The frontend is based on the [Vue.js] JavaScript framework.

# Development

### Prerequisites

- Install [Node.js][node], see version in [package.json](package.json)
- Configure your KNIME Analytics Platform to use the locally running UI

  - download the AP, e.g. from https://www.knime.com/nightly-build-downloads
  - add the following arguments to the `<knime-installation-folder>/knime.ini` (For more information see [this page][debugap])

    | argument                                       | comment                                                                                                            |
    | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
    | `-Dorg.knime.ui.dev.mode=true`                 | Enables debugging the AP's browser from your system browser at http://localhost:8888 and more                      |
    | `-Dorg.knime.ui.dev.url=http://localhost:3000` | Makes the AP use KNIME UI served from localhost instead of using the resources bundled with the KNIME UI Extension |

### Install dependencies

```sh
pnpm install
```

## Launch development server

Compiles all JavaScript sources, assets, … and starts a local web server for development. Includes hot-reloading, so
code changes will be visible in the browser immediately.

```sh
pnpm run dev
```

## UI running in the browser

### Standalone

In addition to running inside the KNIME Analytics Platform, the new UI can also run in the browser. To use this mode, you need to have the proper Eclipse setup, as well as doing a couple extra steps. You can see more information on [this page][debugapbrowser].

After following the steps above, copy the contents of the `.env.example` file over to a `.env` file. Then adjust the value of the `VITE_BROWSER_DEV_WS_URL` variable to match the url and port of the running WSS server (as configured in your Eclipse setup). NOTE: Remember to set `VITE_BROWSER_DEV_MODE` to `true` in your `.env` file, otherwise the `VITE_BROWSER_DEV_WS_URL` variable will have no effect.

When both steps are done, you can open the app in the browser under `http://localhost:3000`

### Loaded in iframe via [AP-loader](https://bitbucket.org/KNIME/knime-hub-ap-loader/src/master/)

If you want to load KNIME UI in an iframe by means of the AP-loader, in addition to the above you need to set the `VITE_BROWSER_DEV_MODE_EMBEDDED` variable to `true` in your `.env` file. This mode will enable you to develop for both knime-ui and the ap-loader application.

### Modes

The Analytics Platform can be started under a _mode_. It is used to specify a broad use-case.
The mode determines the _permissions_ which, in a granular manner, control what functionality of the AP is available.

To configure a mode, set the following Java system property (i.e., add to `knime.ini` or in the "VM Arguments" section in the Eclipse launch configuration).

```
-Dorg.knime.ui.mode=<mode>
```

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

#### Running unit tests

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
[Installation guide]: https://docs.knime.com/latest/analytics_platform_installation_guide/index.html#_configuration_settings_and_knime_ini_file
[husky]: https://www.npmjs.com/package/husky
[lintstaged]: https://github.com/okonet/lint-staged
[debugap]: https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/1418854401/Debug+the+KNIME+AP+Modern+UI+inside+the+AP
[debugapbrowser]: https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/3054895127/Debug+KNIME+AP+Modern+UI+in+browser+w+Eclipse+back+end
