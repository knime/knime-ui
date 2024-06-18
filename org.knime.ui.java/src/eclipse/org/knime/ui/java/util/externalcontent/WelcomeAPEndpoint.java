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
 */
package org.knime.ui.java.util.externalcontent;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.Optional;

import org.apache.commons.io.IOUtils;
import org.apache.http.client.utils.URIBuilder;
import org.eclipse.core.runtime.Platform;
import org.knime.core.node.KNIMEConstants;
import org.knime.core.node.NodeLogger;
import org.knime.core.util.EclipseUtil;
import org.knime.core.util.HubStatistics;
import org.knime.core.util.ThreadLocalHTTPAuthenticator;
import org.knime.core.util.proxy.URLConnectionFactory;
import org.knime.product.rcp.KNIMEApplication;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Manages access to a web endpoint that provides dynamic content to be displayed in the AP.
 *
 * @author Benjamin Moser, KNIME GmbH
 */
public final class WelcomeAPEndpoint {
    private static final String ENDPOINT = "https://tips-and-tricks.knime.com/welcome-ap";

    private WelcomeAPEndpoint() {
    }

    /**
     * @apiNote This method must be called only once when the (modern UI) session is started.
     *
     * @implNote
     *           <ul>
     *           <li>Needs to be static to be accessible from {@code Create} lifecycle transition, which happens before
     *           {@code Init} in which Service- and DesktopAPI-dependencies are being set.</li>
     *           <li>Although its effective purpose (tracking AP usage) is unrelated to welcome page contents, these two
     *           are nevertheless tightly linked: for legal reasons, tracking may only be done when actually obtaining
     *           content. Thus we are forced to use the same endpoint and thus this method is implemented here.</li>
     *           </ul>
     */
    public static void callWelcomeAPEndpointForTrackingStartup() {
        var response = request("create");
        response.ifPresent(r -> {
            try {
                IOUtils.toString(r, StandardCharsets.UTF_8);
            } catch (IOException e) { // NOSONAR
                // do not care about response
            }
        });
    }

    /**
     * @return parameters that should be given with any request
     */
    private static URIBuilder getBaseRequestURI() {
        URIBuilder builder = null;
        try {
            builder = new URIBuilder(ENDPOINT);
        } catch (URISyntaxException e) {
            // guaranteed to not happen, value is hardcoded
            throw new RuntimeException(e); // NOSONAR
        }
        return builder.addParameter("knid", KNIMEConstants.getKNID()) //
            .addParameter("version", KNIMEConstants.VERSION) //
            .addParameter("os", Platform.getOS()) //
            .addParameter("osname", KNIMEConstants.getOSVariant()) //
            .addParameter("arch", Platform.getOSArch()) //
            .addParameter("details", buildAPUsage() + "," + buildHubUsage()) //
            .addParameter("ui", "modern");
    }

    private static Optional<InputStream> request(final String sessionState) {
        if (EclipseUtil.isRunFromSDK()) {
            return Optional.empty();
        }
        try (final var suppression = ThreadLocalHTTPAuthenticator.suppressAuthenticationPopups()) {
            var url = getBaseRequestURI().addParameter("session_state", sessionState).build().toURL();
            HttpURLConnection connection = (HttpURLConnection)URLConnectionFactory.getConnection(url);
            connection.setReadTimeout(5000);
            connection.setConnectTimeout(2000);
            connection.connect();
            try (var response = connection.getInputStream()) {
                return Optional.ofNullable(response);
            } finally {
                connection.disconnect();
            }
        } catch (Exception e) {
            NodeLogger.getLogger(ExternalContent.class)
                    .debug("Could not call 'welcome-AP' endpoint: " + e.getMessage(), e);
        }
        return Optional.empty();
    }

    private static JSONCategory[] parseResponse(final InputStream response) throws IOException {
        var mapper = new ObjectMapper();
        var currentThreadClassLoader = Thread.currentThread().getContextClassLoader();
        Thread.currentThread().setContextClassLoader(ExternalContent.class.getClassLoader());
        try {
            return mapper.readValue(response, JSONCategory[].class);
        } finally {
            Thread.currentThread().setContextClassLoader(currentThreadClassLoader);
        }
    }

    private static String buildAPUsage() {
        // simple distinction between first and recurring users
        var apUsage = "apUsage:";
        if (KNIMEApplication.isStartedWithFreshWorkspace()) {
            apUsage += "first";
        } else {
            apUsage += "recurring";
        }
        return apUsage;
    }

    private static String buildHubUsage() {
        var hubUsage = "hubUsage:";
        Optional<ZonedDateTime> lastLogin = Optional.empty();
        Optional<ZonedDateTime> lastUpload = Optional.empty();
        try {
            lastLogin = HubStatistics.getLastLogin();
            lastUpload = HubStatistics.getLastUpload();
        } catch (Exception e) { // NOSONAR
            NodeLogger.getLogger(ExternalContent.class)
                .info("Hub statistics could not be fetched: " + e.getMessage(), e);
        }

        if (lastUpload.isPresent()) {
            hubUsage += "contributer";
        } else if (lastLogin.isPresent()) {
            hubUsage += "user";
        } else {
            hubUsage += "none";
        }
        return hubUsage;
    }

    /**
     * @return All content provided by the endpoint, in a structured format
     */
    static Optional<JSONCategory[]> getWelcomePageContents() {
        var response = request("operational");
        return response.map(res -> {
            try {
                return parseResponse(res);
            } catch (IOException e) { // NOSONAR
                return null;
            }
        });

    }

    static Map<String, String> tileToMap(JSONTile tile) {
        return Map.of( //
                "title", tile.getTitle(), //
                "image", tile.getImage(), //
                "text", tile.getText(), //
                "button-text", tile.getButtonText(), //
                "link", tile.getLink());
    }
}
