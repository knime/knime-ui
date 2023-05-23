# Generated Gateway API

> **_IMPORTANT:_** Do not modify the `generated-api.ts` file directly. The generated-api.ts file is automatically created as a part of the code-generation helper in [knime-com-shared](https://bitbucket.org/KNIME/knime-com-shared/src/master/com.knime.gateway.codegen/)

## Making changes to the API

When you work on a feature that adds new functionality to the Gateway API, you should then include in your PR in knime-ui the new generated-api file. This file is excluded from linting and formatting so only adding the changes outputted by the code generation helper is enough.

## Architecture

The main idea behind the generated-api is based around the RPCClient contract defined in the `rpc-client.ts` file. This contract allows the API to interact with a provided RPC client via two methods: `call` and `registerEventHandlers`. The implementation of those methods is the responsibility of the consuming app (in this case knime-ui).

In knime-ui's case the implementation of the RPCClient interface is made via a json-rpc-client which you can find in the folder with the same name. This closes the loop and allows the application to interact with the API based on the contract using the provided implementation of said client.
