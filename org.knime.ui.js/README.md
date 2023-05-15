# org.knime.ui.js

This project contains the web frontend for the KNIME Analytics Platform.
The frontend is based on the [Vue.js] JavaScript framework.

## Development

### Prerequisites

- Install [Node.js][node], see version in [package.json](package.json)

Pull the contained [git submodules](https://stackoverflow.com/a/4438292/5134084) with

```sh
git submodule update --init
```

### Install dependencies

```sh
npm install
```

and then use the following commands:

### Launch development server

Compiles all JavaScript sources, assets, … and starts a local web server for development. Includes hot-reloading, so
code changes will be visible in the browser immediately.

```sh
npm run dev
```

### Git hooks

When committing your changes, a couple of commit hooks will run via [husky].
- `pre-commit` hook to lint and format the changes in your stage zone (via [lintstaged])
- `prepare-commit-msg` hook to format your commit message to conform with the required format by KNIME. In order for this to work you must set environment variables with your Atlassian email and API token. Refer to [webapps-common/scripts/README.md](webapps-common/scripts/README.md) for more information.

### Testing

#### Running unit tests

This project contains unit tests written with [vitest].
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

The output can be found in the `test-results` folder. It contains a browseable html report as well as raw coverage data in
[LCOV] and [Clover] format, which can be used in analysis software (SonarQube, Jenkins, …).

### Running security audit

npm provides a check against known security issues of used dependencies. In most cases it is sufficient to only check
dependencies that are used in production. Run it by calling

```sh
npm audit --production
```

In some cases security issues can not be addressed right away or do not pose a direct threat (e.g. build dependencies).
To deal with these run

```sh
npx resolve-audit --production
```

The tool will present you with a few choices regarding every security issue, which you can choose from. Most of the
time it is sufficient to ignore issues for a certain amount of time (e.g. press `i` to ignore and then `M` for one
month). This will create a `audit-resolve.json` with the security exceptions that needs to be checked in. To test if
there is going to be security audit problems on our build system, call

```sh
npm run audit
```

which takes the exceptions into account.

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

[vue.js]: https://vuejs.org/
[node]: https://knime-com.atlassian.net/wiki/spaces/SPECS/pages/905281540/Node.js+Installation
[vitest]: https://vitest.dev/
[lcov]: https://github.com/linux-test-project/lcov
[clover]: http://openclover.org/
[Installation guide]: https://docs.knime.com/latest/analytics_platform_installation_guide/index.html#_configuration_settings_and_knime_ini_file
[husky]: https://www.npmjs.com/package/husky
[lintstaged]: https://github.com/okonet/lint-staged