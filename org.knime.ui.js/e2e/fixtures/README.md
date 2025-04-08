# e2e test fixtures

The fixtures in this folder are used to mock WebSocket responses and are not related to Playwright's built-in fixture system.

## How to obtain the data

- [Run knime-ui in the browser](https://bitbucket.org/KNIME/knime-ui/src/master/org.knime.ui.js/README.md#markdown-header-ui-running-in-the-browser) (it will not work with the desktop app!)

- Open Chrome DevTools (F12 or right-click → Inspect).

- Go to the Network tab.

- Click the "WS" filter to show WebSocket connections.

- Click on the WebSocket connection.

- Open the Messages tab to view sent and received messages.

- Green = server responses, Blue = client messages.

- Right-click message to Copy message data.
