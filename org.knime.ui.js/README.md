# knime-ui

This repository contains the web frontend for the KNIME Analytics Platform.
The frontend is based on the [Nuxt.js] JavaScript framework.

## Development

### Prerequisites

- Install [Node.js **Version 14.6.0**][node]
- Only for test coverage uploads to SonarQube: you also need [Java]™ 8 or 11.

Pull the contained [git submodules](https://stackoverflow.com/a/4438292/5134084) with

```sh
git submodule update --init
```

### Install dependencies

```sh
npm install
```

and then use the following commands. For detailed explanations see [Nuxt.js docs]:

### Launch development server

Compiles all JavaScript sources, assets, … and starts a local web server for development. Includes hot-reloading, so
code changes will be visible in the browser immediately.

```sh
npm run dev
```

### Debugging inside Analytics Platform

In order to run and debug the web app with a functioning backend:

- download the AP, e.g. from https://www.knime.com/nightly-build-downloads
- add VM arguments to the `knime.ini`

| argument | comment |
|-|-|
| `-Dchromium.remote_debugging_port=8888`| Enables the CEF remote debugging mode available at the provided port |
| `-Dorg.knime.ui.debug.url=http://localhost:3000` | (Optional) The web app is served from the given URL instead of using the resources bundled with the AP (this parameter only takes effect if the CEF remote debugging mode is enabled!) |
| `-Dchromium.debug` | (Optional) More verbose debugging output for the CEF |

- start the AP and make sure the _KNIME UI_-feature is installed
  - Menu > File > Install KNIME Extensions
  - possibly uncheck 'Group items by category' (in case the KNIME UI-feature is not yet categorized)
- switch to the new KNIME UI perspective (button on the upper right)
- open `http://localhost:8888` in your browser and select respective web app

### Testing

#### Running unit tests

This project contains unit tests written with [jest].
They are run with

```sh
npm run test:unit
```

During development, you can use `npm run test:unit -- --watch` to have the unit tests run automatically whenever a
source file changes.

You can generate a coverage report with

```sh
npm run coverage
```

The output can be found in the `coverage` folder. It contains a browseable html report as well as raw coverage data in
[LCOV] and [Clover] format, which can be used in analysis software (SonarQube, Jenkins, …).

The following command allows you to upload the coverage data to SonarQube:

```sh
npm run sendcoverage
```

It requires the `SONAR_LOGIN` and `SONAR_PASSWORD` environment variables to be set, which must be valid credentials
for the SonarQube instance configured in `sonar-project.properties`.


#### Running integration tests

Integration tests require a running KNIME AP instance with the web frontend running, and a debugger port open.
To do so, run KNIME with the following parameters which can be added to the `knime.ini`:

```
-Dchromium.remote_debugging_port=8888
-Dorg.knime.ui.debug.url=about:blank
```

If you want to run the tests against a locally running dev server, replace `about:blank` with `http://localhost:3000`.

While the old Java based UI is still around, you must make sure to switch to the new UI before launching the tests.
This can be achieved by manually clicking the button.

As a workspace, you should select the `test/integration/assets/workflows` folder.

Then, you can run the tests via
```
npm run test:integration
```
To run a single test add the filename with path (starting from ./suites), e.g.:
```
npm run test:integration endpoints/workflow/commad/delete.test.js
```

Alternatively, you can use "tags". They are written on every test like this: `Feature('Delete command').tag('@delete');`.
Example to run a single test:

```
npm run test:integration --grep @delete
```


### Running security audit

npm provides a check against known security issues of used dependencies. Run it by calling

```sh
npm audit
```

## Build production version

While this project is a pure JS project, it comes with a maven file that allows it to be built as a Java library.
To do so, run

```sh
mvn package
```

to create a package in the `target` folder, or

```sh
mvn install
```

to install that package to your local maven repository directly.

## API

This app expects a global function called `jsonrpc` that it can use to call Java code. Such function is injected into
the global namespace by the AP (or by the dev app). See `json-rpc-adapter.js` for details.

In turn, this app provides a global function called `jsonrpcNotification` that can be used by Java to call JS functions.
See `json-rpc-notification.js` for details.


[nuxt.js]: https://nuxtjs.org/
[node]: https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/905281540/Node.js+Installation
[java]: https://www.oracle.com/technetwork/java/javase/downloads/index.html
[nuxt.js docs]: https://nuxtjs.org/guide/commands
[jest]: https://jestjs.io/en
[lcov]: https://github.com/linux-test-project/lcov
[clover]: http://openclover.org/
