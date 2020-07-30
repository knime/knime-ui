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

#### Debug CSS

When running the dev server, additional style sheets are loaded that assist in debugging if .env-flag 'DEV_INCLUDE_DEBUG_CSS' is set.

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

[nuxt.js]: https://nuxtjs.org/
[node]: https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/905281540/Node.js+Installation
[java]: https://www.oracle.com/technetwork/java/javase/downloads/index.html
[nuxt.js docs]: https://nuxtjs.org/guide/commands
[jest]: https://jestjs.io/en
[lcov]: https://github.com/linux-test-project/lcov
[clover]: http://openclover.org/
