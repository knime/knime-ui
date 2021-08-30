# CodeceptJS Guide

## Folders

### assets

- Place workflows required for the tests here.
- Important: make sure this workflows folder is selected as the workspace of the KNIME AP you're running the tests to.

### helpers

- Use [Helpers](https://codecept.io/helpers/) to access to instance of Puppeteer or Playwright. This way, you can create more sophisticated methods.
- need to be registered in [codecept.conf.js](codecept.conf.js)
- Used for specific domain methods.
- Please, implement your Helper with a `_getPage` or `_getBrowser` method. This way, we can easily translate to Playwright, considering both the latter and Puppeteer uses the same API.

### plugins

- [Plugins](https://codecept.io/hooks/) allows to use CodeceptJS internal API to extend functionality.
- The reason we are using multiple plugins is organizational.
- need to be registered in [codecept.conf.js](codecept.conf.js)

### steps

- [StepObjects](https://codecept.io/pageobjects/#stepobjects)
- Technically, the same as PageObjects.
- Used to create or abstract common steps.

### suites

- Place your tests here.
- Remember to use `test.js` as extension

# Misc

### steps.d.ts & jsconfig.json

- CodecetJS require them for autocompletion

### steps_file.js

- General methods/assertions frequently used in suites that are not "element" specific.

### About the "comments" messages:

```js
__`Sample step`;
```

- This is known as [Tagged Templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates).
  A CodeceptJS plugin called [Comment Step](https://codecept.io/plugins/#commentstep) utilizes them so you can add comments. The comments will be shown in the output.

### Locator Builder:

If you want to create a complex locator, use the [Locator Builder](https://codecept.io/locators/#locator-builder) from CodeceptJS to improve maintainability and readability.

Example: I want to assert the value from a table. I can use `index` or `child` but this could change. Also, I could use a complex xPath locator but it's hard to understand.

Using the locator builder:

```js
// Select td with specific text.
const currentIteration = locate("td").withText("currentIteration");
// Select the td next to it.
const valueFromCurrentIteration = locate("td").after(currentIteration);
```

### If autocomplete doesn't work after creating a new helper, run inside test/integration:

```sh
npx codeceptjs def .
```

### About "tags":

Example:

```js
Feature("Change Loop State").tag("@endpoints-@nodes-@changeLoopState");
```

By adding [Tags](https://codecept.io/advanced/#tags) to your suites, you can then run a specific test via:

```sh
npm run test:integration @changeLoopState
```

Keep in mind, this is just a simply `grep`. You can use regex aswell.
