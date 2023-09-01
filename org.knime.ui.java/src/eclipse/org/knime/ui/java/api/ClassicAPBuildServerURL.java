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
 *   30 Jun 2023 (baqueroj): created
 */
package org.knime.ui.java.api;

import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.util.Arrays;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.knime.core.node.NodeLogger;
import org.knime.core.util.Version;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt.TypeEnum;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystem;

import com.knime.enterprise.client.filesystem.KnimeRemoteFileSystem;
import com.knime.enterprise.client.filesystem.RemoteFileSystem;
import com.knime.enterprise.client.rest.RestServerContent;
import com.knime.explorer.server.ExplorerServerContentProvider;
import com.knime.explorer.server.rest.RestServerExplorerFileStore;

/**
 * Adaptation of 'OpenInWebPortalAction' from explorer server to build the URL of an item in the webportal
 *
 * @author baqueroj
 */
final class ClassicAPBuildServerURL {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(DesktopAPI.class);

    private static final Version MINIMUM_WEBPORTAL_VERSION = new Version(4, 14, 0);

    private static final String WEBPPORTAL_URL_PREFIX = "webportal/space";

    private static final String LEGACY_WEBPORTAL_URL_PREFIX = "#";

    private ClassicAPBuildServerURL() {
        // utility class
    }

    /**
     * @param itemId
     * @param sourceSpaceProvider a 'non-local' space provider
     * @param sourceSpace
     * @return The built hub URL
     * @throws Exception
     * @throws URISyntaxException
     */
    static String getWebPortalURL(final String itemId, final SpaceProvider sourceSpaceProvider,
        final Space sourceSpace) {
        final StringBuilder urlBuilder = new StringBuilder();
        var serverAddress = sourceSpaceProvider.getServerAddress().orElseThrow();
        final RemoteFileSystem knimeServerFileSystem = getRemoteFileSystem(sourceSpace.toKnimeUrl(itemId));
        int ordinalIndexOf = StringUtils.ordinalIndexOf(serverAddress, "/", 3);
        ordinalIndexOf = ordinalIndexOf > 0 ? ordinalIndexOf : serverAddress.length();
        urlBuilder.append(serverAddress.substring(0, ordinalIndexOf));
        // get webportal path
        final Optional<String> restPath = knimeServerFileSystem.getRESTPath();
        if (!restPath.isPresent()) {
            LOGGER.error("For the selected element there is no REST path available.");
            throw new NoSuchElementException("No REST path available");
        }
        var serverVersion = getServerVersion(serverAddress, restPath.get());
        urlBuilder.append(restPath.get().substring(0, StringUtils.indexOf(restPath.get(), "rest")));
        urlBuilder.append(serverVersion.isSameOrNewer(MINIMUM_WEBPORTAL_VERSION) ? WEBPPORTAL_URL_PREFIX
            : LEGACY_WEBPORTAL_URL_PREFIX);
        // get the path of the selected element and encode the individual path elements
        //        final String workflowName = ((ContentObject)getFirstSelection()).getFileStore().getFullName();
        final String workflowName = sourceSpace.getItemName(itemId);
        urlBuilder.append(Arrays.stream(workflowName.split("/")).map((part) -> {
            try {
                return URLEncoder.encode(part, "UTF-8").replaceAll("\\+", "%20");
            } catch (UnsupportedEncodingException e) {
                LOGGER.error("The workflow name could not be encoded: " + workflowName);
                return "";
            }
        }).collect(Collectors.joining("/")));

        return urlBuilder.toString();
    }

    static String getAPIDefinition(final String itemId, final SpaceProvider sourceSpaceProvider,
        final Space sourceSpace) {
        assert sourceSpaceProvider.getType() != TypeEnum.LOCAL;
        final RemoteFileSystem knimeServerFileSystem = getRemoteFileSystem(sourceSpace.toKnimeUrl(itemId));
        URI targetUri = null;
        try {
            URI serverAddress = new URI(knimeServerFileSystem.getServerAddress());
            String workflowPath = sourceSpace.getItemName(itemId);
            String restPath = knimeServerFileSystem.getRESTPath()
                .orElseThrow(() -> new IllegalStateException("Action is run although no REST path is available"));
            targetUri = new URI(serverAddress.getScheme(), serverAddress.getAuthority(),
                restPath + "/v4/repository" + workflowPath + ":openapi", "showInUI=true", null);

            return targetUri.toString();
        } catch (URISyntaxException e) {
            LOGGER.error("Invalid URL could not be opened: " + targetUri.toString(), e);
            return "";
        }
    }

    /**
     * Returns the remote file system that is being used. This is either the {@link KnimeRemoteFileSystem} (in case of
     * EJB) or the {@link RestServerContent} (in case of REST).
     *
     * @return The remote file system that is being used.
     *
     * @see #getKnimeServerFileSystem()
     *
     * @since 4.8
     */
    static private RemoteFileSystem getRemoteFileSystem(final URI itemPath) {
        var fileSystem = (RestServerExplorerFileStore)ExplorerFileSystem.INSTANCE.getStore(itemPath);

        return fileSystem.getRemoteFileSystem();
    }

    static private Version getServerVersion(final String serverAddress, final String restPath) {
        try {
            var address = new URI(serverAddress + restPath);
            return ExplorerServerContentProvider.fetchServerInformation(address).getVersion();
        } catch (Exception e) {
            LOGGER.error("Error during fetch of server information", e);
            return null;
        }
    }

}
