# CodeceptJS Guide

### codecept.config.js
- In the root folder.
- Function:
    - Add Helpers
    - Add Plugins
    - Select driver (Puppeteer, Playwright).

## Folders

### assets
- Place your workflows here.
- Important: make sure when you are testing through websocket, workflows folder is selected as root on Knime AP.

### helpers
- You can use them to access to instance of Puppeteer or Playwright. This way, you can create more sophisticated methods.
- Used for specific domain methods.
- Please, implement your Helper with a _getPage or _getBrowser method. This way, we can easily translate to Playwright, considering both the latter and Puppeteer uses the same API.

[Helpers](https://codecept.io/helpers/)

### plugins
- Plugins allow to use CodeceptJS internal API to extend functionality.
- The reason we are using multiple plugins is organization.

[About plugins](https://codecept.io/hooks/)

### suites
- Place your tests here.
- Remember to use `test.js` as extension


---

# Misc

### About steps.d.ts, steps_file.js & jsconfig.json
- CodecetJS require them for autocomplete

### If you don't have autocomplete after creating a new Helper
- run `npx codeceptjs def .`