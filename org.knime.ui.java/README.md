# org.knime.ui.java

This project contains the java-code required to embed the web app (org.knime.ui.js) into the Chromium Embedded Framework (CEF) and connect it to the java-backend.

It's an OSGi-plugin which contains the logic to
* switch between the java-based UI and the web UI
* inject the logic to enable JS-Java communication (mainly injecting functions into the browser's window-object)
* embed the CEF in an eclipse-view
* read in the web app resources (from org.knime.ui.js) and deliver it to the browser

## Notes on the JS-Java communication

### Message exchange patterns

There are two ways messages are being exchanged between JS and Java:
* through Requests (JS to Java) + Responses (Java to JS):
  JS can send requests to Java and receives respective responses.
* Events (Java to JS):
  There can be sent events from the Java-side at any moment (e.g. workflow execution progress updates).

### Transport

The message are being transported from/to JS to/from Java using different mechanisms, depending on where the web app is running; i.e. local AP (CEF) or the Hub (any browser).
In case of the local AP, we use a low-level transport mechanism provided by CEF (called 'equo comm service') which does _not_ rely on a TCP/IP-port being opened.
In case of the Hub, communication is done through WebSockets.

The frontend (web app), however, is transport-agnostic and thus doesn't know about the transport mechanism (i.e. doesn't contain any transport-specific logic). The transport logic is injected by the backend (e.g. by executing a JS-script from Java (CEF) or injecting a script into the web app html document (Hub).

### Message format

The messages that are being transferred are [json-rpc](https://www.jsonrpc.org/) messages (json-rpc requests and json-rpc responses) or json-rpc notifications in case of events.

The json-rpc messages encode 'remote procedure call' (method-name + parameters) which are being translated into real method calls into the API (the so-called Gateway API) on the Java-side.
