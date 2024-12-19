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

import static java.util.function.Predicate.not;

import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLEncoder;
import java.util.Arrays;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

import org.apache.commons.lang3.StringUtils;
import org.knime.core.node.NodeLogger;
import org.knime.core.util.Version;
import org.knime.core.util.exception.ResourceAccessException;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt.TypeEnum;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.ui.java.util.DesktopAPUtil;

/**
 * Adaptation of 'OpenInWebPortalAction' and 'ShowAPIDefinitionAction' from explorer server to build the URL of an item
 * in the webportal and it swagger API definition
 *
 * @author baqueroj
 */
final class ClassicAPBuildServerURL {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(ClassicAPBuildServerURL.class);

    private static final Version MINIMUM_WEBPORTAL_VERSION = new Version(4, 14, 0);

    private static final String WEBPPORTAL_URL_PREFIX = "webportal/space/";

    private static final String LEGACY_WEBPORTAL_URL_PREFIX = "#";

    private ClassicAPBuildServerURL() {
        // utility class
    }

    /**
     * @param itemId
     * @param sourceSpaceProvider a 'non-local' space provider
     * @param sourceSpace
     * @return The built server URL
     */
    static String getWebPortalURL(final String itemId, final SpaceProvider sourceSpaceProvider,
        final Space sourceSpace) {
        final var urlBuilder = new StringBuilder();
        final var serverAddress = sourceSpaceProvider.getServerAddress().orElseThrow();
        int ordinalIndexOf = StringUtils.ordinalIndexOf(serverAddress, "/", 3);
        ordinalIndexOf = ordinalIndexOf > 0 ? ordinalIndexOf : serverAddress.length();
        urlBuilder.append(serverAddress.substring(0, ordinalIndexOf));
        final var restPath = sourceSpaceProvider.getRESTPath();
        if (!restPath.isPresent()) {
            LOGGER.error("For the selected element there is no REST path available.");
            showURLBuildError("No REST path available");
            throw new NoSuchElementException("No REST path available");
        }
        final var serverVersion = sourceSpaceProvider.getServerVersion();
        urlBuilder.append(restPath.get().substring(0, StringUtils.indexOf(restPath.get(), "rest")));
        urlBuilder.append(serverVersion.isSameOrNewer(MINIMUM_WEBPORTAL_VERSION) ? WEBPPORTAL_URL_PREFIX
            : LEGACY_WEBPORTAL_URL_PREFIX);
        final var workflowPath = buildWorkflowPath(sourceSpace, itemId);

        urlBuilder.append(Arrays.stream(workflowPath.split("/")).map(part -> {
            try {
                return URLEncoder.encode(part, "UTF-8").replace("+", "%20");
            } catch (UnsupportedEncodingException e) {
                LOGGER.error("The workflow name could not be encoded: " + urlBuilder + workflowPath);
                showURLBuildError("Error when encoding the workflow name, check the logs for details.");
                throw new RuntimeException(e);  // NOSONAR
            }
        }).collect(Collectors.joining("/")));

        return urlBuilder.toString() + "/";
    }

    /**
     * @param itemId
     * @param sourceSpaceProvider a 'non-local' space provider
     * @param sourceSpace
     * @return The built server API definition URL
     */
    static String getAPIDefinition(final String itemId, final SpaceProvider sourceSpaceProvider,
        final Space sourceSpace) {
        assert sourceSpaceProvider.getType() != TypeEnum.LOCAL;
        try {
            final var serverAddress = new URI(sourceSpaceProvider.getServerAddress().orElseThrow());
            final var workflowPath = buildWorkflowPath(sourceSpace, itemId);
            final var restPath = sourceSpaceProvider.getRESTPath()
                .orElseThrow(() -> new IllegalStateException("Action is run although no REST path is available"));
            final var targetUri = new URI(serverAddress.getScheme(), serverAddress.getAuthority(),
                restPath + "/v4/repository/" + workflowPath + ":openapi", "showInUI=true", null);

            return targetUri.toString();
        } catch (URISyntaxException e) {
            LOGGER.error("Invalid URL could not be parsed", e);
            showURLBuildError("Invalid URL could not be parsed");
            return "";
        }
    }

    private static String buildWorkflowPath(final Space sourceSpace, final String itemId) {
        final var workflowName = sourceSpace.getItemName(itemId);

        List<String> ancestorItemIds;
        try {
            ancestorItemIds = sourceSpace.getAncestorItemIds(itemId);
        } catch (ResourceAccessException e) { // NOSONAR: No need to log or re-throw
            ancestorItemIds = List.of(); // Never happens, `ServerSpace.getAncestorItemIds(...)` doesn't throw
        }

        final var itemPathNames = ancestorItemIds.stream() //
            .filter(not("root"::equals)) //
            .map(sourceSpace::getItemName).toList();
        final var workflowPath = new StringBuilder(workflowName);
        for (String part : itemPathNames) {
            workflowPath.insert(0, part + "/");
        }
        return workflowPath.toString();
    }

    private static void showURLBuildError(final String message) {
        DesktopAPUtil.showError("Error when building URL", message);
    }

}
