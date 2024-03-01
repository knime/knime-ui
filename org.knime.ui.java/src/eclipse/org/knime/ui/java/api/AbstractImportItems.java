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
 *   Jan 23, 2023 (kai): created
 */
package org.knime.ui.java.api;


import java.io.IOException;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.swt.widgets.FileDialog;
import org.knime.core.node.NodeLogger;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.ui.java.util.DesktopAPUtil;

/**
 * Abstract helper class to import files or workflows into a given workspace.
 *
 * @author Kai Franze, KNIME GmbH
 */
abstract class AbstractImportItems {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(AbstractImportItems.class);

    /**
     * @return the ids of the imported items or {@code null} if the import failed
     */
    String[] importItems(final Space space, final String itemId) throws IOException {
        // Get file paths of files to import
        var dialog = getFileDialog();
        var pathString = dialog.open();
        if (pathString == null) {
            return null; // NOSONAR
        }
        var baseDir = Path.of(pathString).getParent();
        var fileNames = dialog.getFileNames();
        var srcPaths = Arrays.stream(fileNames).map(baseDir::resolve).toList();

        // Check for name collisions and solve them
        var collisionHandling = checkForNameCollisionsAndSuggestSolution(space, itemId, srcPaths).orElse(null);
        if (collisionHandling == null) {
            return null; // NOSONAR
        }

        // Attempt to import files
        var importedSpaceItems = DesktopAPUtil.runWithProgress(itemId, LOGGER, //
                monitor -> importItems(monitor, space, itemId, srcPaths, collisionHandling)) //
            .orElse(Collections.emptyList());

        if (importedSpaceItems.size() < fileNames.length) {
            showWarningWithTitleAndMessage();
        }

        // Create response for the FE
        return importedSpaceItems.stream().map(SpaceItemEnt::getId).toArray(String[]::new);
    }

    /**
     * @return The file dialog needed to pick something to import.
     */
    protected abstract FileDialog getFileDialog();

    /**
     * Checks for name collision and prompts the user to accept suggested auto-renaming solution.
     *
     * @param space surrounding space
     * @param workflowGroupItemId The workflow group item ID to check
     * @param srcPaths The source paths of the items to import
     *
     * @return Can be one of {@link NameCollisionHandling}, or an empty optional if no collision handling strategy is
     *         provided
     * @throws IOException In case some files could not be read
     */
    protected abstract Optional<NameCollisionHandling> checkForNameCollisionsAndSuggestSolution(Space space,
        final String workflowGroupItemId, final List<Path> srcPaths) throws IOException;

    /**
     * Shows a warning if the import was not complete.
     */
    protected abstract void showWarningWithTitleAndMessage();

    /**
     * The function to run with progress to import the items
     *
     * @param monitor The progress monitor passed in
     * @param space space to import the items into
     * @param workflowGroupItemId The workflow group item ID
     * @param srcPaths The source paths of the items to import
     * @param collisionHandling The name collision handling to use
     *
     * @return A list of space item entities that were imported
     */
    protected abstract List<SpaceItemEnt> importItems(IProgressMonitor monitor, Space space, String workflowGroupItemId,
        List<Path> srcPaths, final NameCollisionHandling collisionHandling);
}
