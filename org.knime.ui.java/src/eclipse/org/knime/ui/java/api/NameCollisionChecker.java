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
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.zip.ZipFile;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.SWT;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.ui.java.util.LocalSpaceUtil;

/**
 * Utility methods to checks for name collisions and handling option selection.
 *
 * @author Kai Franze, KNIME GmbH
 */
final class NameCollisionChecker {

    /** Dialog constant */
    static final String CANCEL = "cancel";

    private NameCollisionChecker() {
        // Utility method
    }

    /**
     * Checks for name collisions before something is written to the destination workflow group.
     *
     * @param itemIds The list of source item IDs
     * @param destWorkflowGroupItemId The destination workflow group ID
     *
     * @return List of already existing names
     */
    static List<String> checkForNameCollisions(final Object[] itemIds, final String destWorkflowGroupItemId) {
        var localWorkSpace = LocalSpaceUtil.getLocalWorkspace();
        return Arrays.stream(itemIds)//
            .map(String.class::cast)//
            .map(localWorkSpace::getItemName)//
            .filter(itemName -> localWorkSpace.containsItemWithName(destWorkflowGroupItemId, itemName))//
            .collect(Collectors.toList());
    }

    /**
     * Checks for name collisions before something is written to the destination workflow group.
     *
     * @param srcPaths The list of source paths
     * @param destWorkflowGroupItemId The destination workflow group ID
     *
     * @return List of already existing names
     */
    static List<String> checkForNameCollisions(final List<Path> srcPaths, final String destWorkflowGroupItemId) {
        var localWorkspace = LocalSpaceUtil.getLocalWorkspace();
        return srcPaths.stream()//
            .map(Path::getFileName)//
            .map(Path::toString)//
            .filter(itemName -> localWorkspace.containsItemWithName(destWorkflowGroupItemId, itemName))//
            .collect(Collectors.toList());
    }

    /**
     * Checks for name collisions before something is written to the destination workflow group.
     *
     * @param srcPath The source path of the *.zip file
     * @param destWorkflowGroupItemId The destination workflow group ID
     *
     * @return The optional name of the existing workflow group.
     * @throws IOException If it couldn't extract the *.zip file properly.
     */
    static Optional<String> checkForNameCollision(final Path srcPath, final String destWorkflowGroupItemId)
        throws IOException {
        var localWorkspace = LocalSpaceUtil.getLocalWorkspace();
        try (var zipFile = new ZipFile(srcPath.toFile())) { // To close the resource
            var dirName = zipFile.stream()//
                .map(entry -> org.eclipse.core.runtime.Path.forPosix(entry.toString()).segment(0))//
                .findFirst()//
                .orElseThrow(IOException::new);
            return Optional.of(dirName)//
                .filter(name -> localWorkspace.containsItemWithName(destWorkflowGroupItemId, name));
        }
    }

    /**
     * Shows dialog to select name collision handling dialog before something is written to the destination workflow
     * group.
     *
     * @return Can be either {@link Space.NameCollisionHandling#AUTORENAME},
     *         {@link Space.NameCollisionHandling#OVERWRITE} or {@link Space.NameCollisionHandling#CANCEL}.
     */
    static Space.NameCollisionHandling openDialogToSelectCollisionHandling(final String workflowGroupItemId,
        final List<String> nameCollisions) {
        var localWorkspace = LocalSpaceUtil.getLocalWorkspace();
        var names = nameCollisions.stream().map(name -> "* " + name).collect(Collectors.joining("\n"));
        var sh = SWTUtilities.getActiveShell();
        var msg = String.format(
            "The following items already exist in \"%s\": %n%n%s %n%n"
                + "Overwrite existing items or keep all by renaming automatically?",
            localWorkspace.getItemName(workflowGroupItemId), names);
        var choice = MessageDialog.open(MessageDialog.QUESTION, sh, "Items already exist", msg, SWT.NONE, //
            "Cancel", // 0
            "Overwrite", // 1
            "Keep all"// 2
        );
        if (choice == 0) {
            return Space.NameCollisionHandling.CANCEL;
        } else if (choice == 1) {
            return Space.NameCollisionHandling.OVERWRITE;
        } else {
            return Space.NameCollisionHandling.AUTORENAME;
        }
    }

}
