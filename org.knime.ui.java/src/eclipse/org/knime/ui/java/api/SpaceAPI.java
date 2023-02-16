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

import static org.knime.ui.java.api.DesktopAPI.MAPPER;

import java.util.Arrays;
import java.util.Locale;
import java.util.Map.Entry;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import org.eclipse.swt.widgets.Display;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProvider.SpaceProviderConnection;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;
import org.knime.ui.java.api.SpaceDestinationPicker.Operation;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.workbench.explorer.filesystem.ExplorerFileSystem;

/**
 * Functions around spaces.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class SpaceAPI {

    private SpaceAPI() {
       // stateless
    }

    /**
     * Returns infos on all available {@link SpaceProviders}. It's a browser function because this functionality is only
     * available in the desktop AP (the desktop AP, e.g., can connect to multiple hubs).
     *
     * @return
     */
    @API
    static String getSpaceProviders() {
        var res = MAPPER.createObjectNode();
        for (var sp : DesktopAPI.getDeps(SpaceProviders.class).getProvidersMap().values()) {
            var isLocalSpaceProvider = sp.isLocal();
            var connectionMode = isLocalSpaceProvider ? "AUTOMATIC" : "AUTHENTICATED";
            res.set(sp.getId(), MAPPER.createObjectNode().put("id", sp.getId()) //
                .put("name", sp.getName()) //
                .put("connected", isLocalSpaceProvider || sp.getConnection(false).isPresent()) //
                .put("connectionMode", connectionMode) //
                .put("local", isLocalSpaceProvider));
        }
        return res.toPrettyString();
    }

    /**
     * Connects a space provider to its remote location. I.e. essentially calls {@link SpaceProvider#connect()}.
     *
     * @return A JSON object with a user name if the login was successful. Returns {@code null} otherwise.
     */
    @API
    static String connectSpaceProvider(final String spaceProviderId) {
        var spaceProvider = DesktopAPI.getDeps(SpaceProviders.class).getProvidersMap().get(spaceProviderId);
        if (spaceProvider != null && spaceProvider.getConnection(false).isEmpty()) {
            return spaceProvider.getConnection(true)//
                .map(SpaceProviderConnection::getUsername)//
                .filter(Predicate.not(String::isEmpty))//
                .map(username -> MAPPER.createObjectNode().putObject("user").put("name", username).toPrettyString())
                .orElse(null);
        }
        return null;
    }

    /**
     *
     * Disconnects a space provider from its remote location. Essentially calls
     * {@link SpaceProviderConnection#disconnect()}.
     *
     * @param spaceProviderId
     */
    @API
    static void disconnectSpaceProvider(final String spaceProviderId) {
        var spaceProvider = DesktopAPI.getDeps(SpaceProviders.class).getProvidersMap().get(spaceProviderId);
        if (spaceProvider != null) {
            spaceProvider.getConnection(false).ifPresent(SpaceProviderConnection::disconnect);
        }
    }

    /**
     * Checks if the names of the corresponding space items already exists within the destination workflow group. If so,
     * it will present a dialog to select the preferred solution for it.
     *
     * @param spaceProviderId The space provider ID
     * @param spaceId The space ID
     * @param itemIds The space item IDs
     * @param destWorkflowGroupId The destination workflow group ID
     * @return Can be one of the {@link Space.NameCollisionHandling}-values or 'CANCEL'
     */
    @API
    static String getNameCollisionStrategy(final String spaceProviderId, final String spaceId, final Object[] itemIds,
        final String destWorkflowGroupItemId) {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        var nameCollisions = NameCollisionChecker.checkForNameCollisions(space, destWorkflowGroupItemId, itemIds);
        if (nameCollisions.isEmpty()) {
            return Space.NameCollisionHandling.NOOP.toString();
        } else {
            return NameCollisionChecker //
                .openDialogToSelectCollisionHandling(space, destWorkflowGroupItemId, nameCollisions) //
                .map(NameCollisionHandling::toString) //
                .orElse("CANCEL");
        }
    }

    /**
     * Copies space items from Local to Hub space or vice versa.
     *
     * @param spaceProviderId provider ID of the source space
     * @param spaceId ID of the source space
     * @param arr array of item IDs
     * @return {@code true} if all files could be uploaded, {@code false} otherwise
     */
    @API
    static boolean copyBetweenSpaces(final String spaceProviderId, final String spaceId, final Object[] arr) {
        if (arr.length == 0) {
            return true;
        }

        final var spaceProviders = DesktopAPI.getDeps(SpaceProviders.class);
        final var sourceSpace = SpaceProviders.getSpace(spaceProviders, spaceProviderId, spaceId);

        final var upload = Arrays.stream(arr) //
                .map(String.class::cast) //
                .map(sourceSpace::toKnimeUrl) //
                .map(ExplorerFileSystem.INSTANCE::getStore) //
                .collect(Collectors.toList());

        final var isLocal = sourceSpace instanceof LocalWorkspace;
        final var mountIds = !isLocal ? new String[] { LocalWorkspace.LOCAL_WORKSPACE_ID.toUpperCase(Locale.ROOT) }
            : spaceProviders.getProvidersMap().entrySet().stream() //
                .filter(provider -> !provider.getValue().isLocal()
                    && provider.getValue().getConnection(false).isPresent()) //
                .map(Entry::getKey) //
                .toArray(String[]::new);

        if (mountIds.length == 0) {
            DesktopAPUtil.showWarning("No Hub spaces available", "Please log into the Hub you want to upload to.");
            return false;
        }

        final var destInfoOptional = SpaceDestinationPicker.promptForTargetLocation(mountIds,
            isLocal ? Operation.UPLOAD : Operation.DOWNLOAD);
        if (!destInfoOptional.isPresent()) {
            return false;
        }

        final var destInfo = destInfoOptional.get();
        final var destinationStore = destInfo.getDestination();
        final var shell = Display.getCurrent().getActiveShell();
        return new ClassicAPCopyMoveLogic(Arrays.asList(mountIds), shell, upload, destinationStore, false).run();
    }
}
