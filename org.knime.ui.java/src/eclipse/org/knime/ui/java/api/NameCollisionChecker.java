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
 *   Feb 2, 2023 (kai): created
 */
package org.knime.ui.java.api;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

import org.eclipse.core.runtime.IPath;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.SWT;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.core.util.Pair;
import org.knime.gateway.api.webui.service.util.MutableServiceCallException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.LoggedOutException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NetworkException;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;

/**
 * Utility methods to checks for name collisions and handling option selection.
 *
 * @author Kai Franze, KNIME GmbH
 */
final class NameCollisionChecker {

    /** Contexts in which the user is asked for preferred name collision handling. */
    enum UsageContext {
        IMPORT,
        SAVE,
        COPY,
        MOVE
    }

    private NameCollisionChecker() {
    }

    /**
     * Checks for name collisions before something is written to the destination workflow group.
     *
     * @param space surrounding space
     * @param destWorkflowGroupItemId The destination workflow group ID
     * @param itemIds The list of source item IDs
     * @return List of already existing names
     * @throws LoggedOutException
     * @throws NetworkException
     * @throws MutableServiceCallException
     */
    static List<String> checkForNameCollisions(final Space space, final String destWorkflowGroupItemId,
        final Object[] itemIds) throws NetworkException, LoggedOutException, MutableServiceCallException {
        final List<String> itemNames = new ArrayList<>();
        for (final var id : itemIds) {
            itemNames.add(space.getItemName(id.toString()));
        }
        return checkForNameCollisions(space, destWorkflowGroupItemId, itemNames.stream());
    }

    /**
     * Checks for name collisions before something is written to the destination workflow group.
     *
     * @param space surrounding space
     * @param destWorkflowGroupItemId The destination workflow group ID
     * @param itemNames The already-present item names
     * @return List of already existing names
     * @throws LoggedOutException
     * @throws NetworkException
     * @throws MutableServiceCallException
     */
    static List<String> checkForNameCollisions(final Space space, final String destWorkflowGroupItemId,
        final Stream<String> itemNames) throws NetworkException, LoggedOutException, MutableServiceCallException {

        final List<String> existing = new ArrayList<>();
        for (final String itemName : (Iterable<String>)itemNames::iterator) {
            if (space.containsItemWithName(destWorkflowGroupItemId, itemName)) {
                existing.add(itemName);
            }
        }
        return existing;
    }

    /**
     * Check for name collisions
     *
     * @param space The space to check in
     * @param destinationItemId The item ID of the workflow group to check in
     * @param itemIds The new item ids to check whether they collide with anything already present
     * @return {@code true} iff there is a name collision, {@code false} otherwise.
     * @throws LoggedOutException
     * @throws NetworkException
     * @throws MutableServiceCallException
     */
    static boolean test(final Space space, final String destinationItemId, final List<String> itemIds)
        throws NetworkException, LoggedOutException, MutableServiceCallException {
        for (final var itemId : itemIds) {
            final var itemName = space.getItemName(itemId);
            if (space.containsItemWithName(destinationItemId, itemName)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks for name collisions before something is written to the destination workflow group.
     *
     * @param space surrounding space
     * @param destWorkflowGroupItemId The destination workflow group ID
     * @param srcPaths The list of source paths
     * @return List of already existing names
     * @throws LoggedOutException
     * @throws NetworkException
     * @throws MutableServiceCallException
     */
    static List<String> checkForNameCollisions(final Space space, final String destWorkflowGroupItemId,
        final List<Path> srcPaths) throws NetworkException, LoggedOutException, MutableServiceCallException {

        final List<String> existing = new ArrayList<>();
        for (final var srcPath : srcPaths) {
            final var itemName = srcPath.getFileName().toString();
            if (space.containsItemWithName(destWorkflowGroupItemId, itemName)) {
                existing.add(itemName);
            }
        }
        return existing;
    }

    /**
     * Checks for name collisions before something is written to the destination workflow group.
     *
     * @param space surrounding space
     * @param destWorkflowGroupItemId The destination workflow group ID
     * @param srcPath The source path of the *.zip file
     * @return The optional name of the existing workflow group.
     * @throws LoggedOutException
     * @throws NetworkException
     * @throws MutableServiceCallException
     */
    static Optional<String> checkForNameCollisionInZip(final Space space, final Path srcPath,
        final String destWorkflowGroupItemId)
        throws NetworkException, LoggedOutException, MutableServiceCallException {
        try (final var zipFile = new ZipFile(srcPath.toFile())) {
            final var rootNames = zipFile.stream() //
                .map(ZipEntry::getName) // item path
                .map(IPath::forPosix) // parse path
                .map(path -> path.segment(0)) // get root item name
                .collect(Collectors.toSet());
            if (rootNames.size() != 1) {
                throw new MutableServiceCallException(
                    "Expected single item in archive '%s', found %s".formatted(srcPath, rootNames), false,
                    null);
            }
            final String name = rootNames.iterator().next();
            return space.containsItemWithName(destWorkflowGroupItemId, name) ? Optional.of(name) : Optional.empty();
        } catch (final IOException e) {
            throw new MutableServiceCallException(e.getMessage(), true, e)
                .addDetails("Failed to read '%s'.".formatted(srcPath));
        }
    }

    /**
     * Shows dialog to select name collision handling dialog before something is written to the destination workflow
     * group.
     *
     * @return Can be either {@link Space.NameCollisionHandling#AUTORENAME},
     *         {@link Space.NameCollisionHandling#OVERWRITE} or an empty optional if no collision handling strategy has
     *         been selected (cancel)
     * @throws LoggedOutException
     * @throws NetworkException
     * @throws MutableServiceCallException
     */
    static Optional<NameCollisionHandling> openDialogToSelectCollisionHandling(final Space space,
        final String workflowGroupItemId, final List<String> nameCollisions, final UsageContext context)
        throws NetworkException, LoggedOutException, MutableServiceCallException {
        final var groupName = space.getItemName(workflowGroupItemId);
        return openDialogToSelectCollisionHandling(groupName, nameCollisions, context, true);
    }

    static Optional<NameCollisionHandling> openDialogToSelectCollisionHandling(final String group,
        final List<String> nameCollisions, final UsageContext context, final boolean canOverwrite) {
        var names = nameCollisions.stream().map(name -> "* " + name).collect(Collectors.joining("\n"));
        final var question = canOverwrite ? "Overwrite existing items or keep all by renaming automatically?"
            : "Item types are incompatible, keep all by renaming automatically?";
        var sh = SWTUtilities.getActiveShell();
        var msg = String.format("The following items already exist in \"%s\": %n%n%s %n%n%s", group, names, question);
        final var renameText = switch (context) {
            case IMPORT -> "Import";
            case SAVE -> "Save";
            case COPY -> "Copy";
            case MOVE -> "Move";
        };
        final List<Pair<String, NameCollisionHandling>> options  = new ArrayList<>(List.of(Pair.create("Cancel", null),
            Pair.create(renameText + " with new name", NameCollisionHandling.AUTORENAME)));
        if (canOverwrite) {
            options.add(1, Pair.create("Overwrite", NameCollisionHandling.OVERWRITE));
        }
        var choice = MessageDialog.open(MessageDialog.QUESTION, sh, "Items already exist", msg, SWT.NONE,
            options.stream().map(Pair::getFirst).toArray(String[]::new));
        if (choice == -1) { // choice is -1 if the dialog is closed
            return Optional.empty();
        }
        return Optional.ofNullable(options.get(choice).getSecond());
    }
}
