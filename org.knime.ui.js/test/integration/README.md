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

### suites
- Place your tests here.
- Remember to use `test.js` as extension



# Misc

### steps.d.ts, steps_file.js & jsconfig.json
- CodecetJS require them for autocompletion

### If autocomplete doesn't work after creating a new helper, run
```sh
npx codeceptjs def .
```