/*
 * ------------------------------------------------------------------------
 *
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.com; Email: contact@knime.com
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License, Version 3, as
 *  published by the Free Software Foundation.
 *
 *  This program is distributed in the hope that it will be useful, but
 *  WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, see <http://www.gnu.org/licenses>.
 *
 *  Additional permission under GNU GPL version 3 section 7:
 *
 *  KNIME interoperates with ECLIPSE solely via ECLIPSE's plug-in APIs.
 *  Hence, KNIME and ECLIPSE are both independent programs and are not
 *  derived from each other. Should, however, the interpretation of the
 *  GNU GPL Version 3 ("License") under any applicable laws result in
 *  KNIME and ECLIPSE being a combined program, KNIME AG herewith grants
 *  you the additional permission to use and propagate KNIME together with
 *  ECLIPSE with only the license terms in place for ECLIPSE applying to
 *  ECLIPSE and the GNU GPL Version 3 applying for KNIME, provided the
 *  license terms of ECLIPSE themselves allow for the respective use and
 *  propagation of ECLIPSE together with KNIME.
 *
 *  Additional permission relating to nodes for KNIME that extend the Node
 *  Extension (and in particular that are based on subclasses of NodeModel,
 *  NodeDialog, and NodeView) and that only interoperate with KNIME through
 *  standard APIs ("Nodes"):
 *  Nodes are deemed to be separate and independent programs and to not be
 *  covered works.  Notwithstanding anything to the contrary in the
 *  License, the License does not apply to Nodes, you are not required to
 *  license Nodes under the License, and you are granted a license to
 *  prepare and propagate Nodes, in each case even if such Nodes are
 *  propagated with or for interoperation with KNIME.  The owner of a Node
 *  may freely choose the license terms applicable to such Node, including
 *  when such Node is propagated with or for interoperation with KNIME.
 * ---------------------------------------------------------------------
 *
 * History
 *   Jan 30, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse.BodyHandlers;

import org.knime.core.util.auth.CouldNotAuthorizeException;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 */
final class HttpProxyAPI {

    private HttpProxyAPI() {
        // stateless
    }

    private final static ObjectMapper MAPPER = new ObjectMapper();

    private record ProxyRequestOptions(String url, String method, String body) {
    }

    private static String getAuthHeaderValue(final SpaceProvider spaceProvider) {
        var connection = spaceProvider.getConnection(true)
            .orElseThrow(() -> new IllegalStateException("Space provider needs to be connect but was not."));
        try {
            return connection.getAuthorization();
        } catch (CouldNotAuthorizeException e) {
            throw new RuntimeException("Could not get auth from space connection.", e);
        }
    }

    private static ProxyRequestOptions deserialize(final String jsonString) {
        try {
            return MAPPER.readValue(jsonString, ProxyRequestOptions.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Could not deserialize request options.", e);
        }
    }

    /**
     * Opens the swing dialog or CEF-based dialog of a node.
     *
     * @param projectId
     * @param nodeId
     */
    @API
    static String proxyRequest(final String providerId, final String requestOptionsString) {
        var spaceProvider = DesktopAPI.getDeps(SpaceProviders.class).getProvidersMap().get(providerId);
        if (spaceProvider == null) {
            throw new IllegalArgumentException(
                "Could not find space provider for passed provider id '%s'".formatted(providerId));
        }

        var authHeader = getAuthHeaderValue(spaceProvider);
        var requestOptions = deserialize(requestOptionsString);

        var baseUrl = spaceProvider.getServerAddress();
        var requestUri = URI.create("%s/%s".formatted(baseUrl, requestOptions.url));
        var requestBody = requestOptions.body;

        var httpRequest = HttpRequest.newBuilder(requestUri).method(requestOptions.method, requestBody == null
            ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(requestBody))
                .header("Authentication", authHeader)
                .build();

        try {
            var response = HttpClient.newHttpClient().send(httpRequest, BodyHandlers.ofString());
            return response.body();
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException(e);
        }
    }
}
