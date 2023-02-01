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
 *   Jan 19, 2023 (kai): created
 */
package org.knime.ui.java.api;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.function.Consumer;
import java.util.zip.ZipFile;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.FileDialog;
import org.knime.core.node.KNIMEConstants;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.WorkflowPersistor;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.LocalSpaceUtil;
import org.knime.workbench.ui.workflow.metadata.MetaInfoFile;

/**
 * Import workflows into a workspace and save them to the specified location.
 *
 * @author Kai Franze, KNIME GmbH
 */
class ImportWorkflows extends AbstractImportItems {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(ImportWorkflows.class);

    @Override
    protected FileDialog getFileDialog() {
        var dialog = new FileDialog(SWTUtilities.getActiveShell(), SWT.OPEN);
        dialog.setFilterExtensions(new String[]{
            "*." + KNIMEConstants.KNIME_WORKFLOW_FILE_EXTENSION + ";*." + KNIMEConstants.KNIME_ARCHIVE_FILE_EXTENSION});
        return dialog;
    }

    @Override
    protected boolean checkForNameCollisionsAndSuggestSolution(final String workflowGroupId,
        final List<Path> srcPaths) {
        var localWorkspace = LocalSpaceUtil.getLocalWorkspace();
        var archiveFilePath = srcPaths.get(0); // There can only be one
        try (var zipFile = new ZipFile(archiveFilePath.toFile())) {
            // Get the name of the parent folder without extracting the *.zip archive
            var dirName = zipFile.stream()//
                .map(entry -> new File(entry.toString()))//
                .map(File::getParentFile)//
                .filter(file -> file.getParentFile() == null) // Make sure it is a top level file
                .map(File::getName)//
                .findFirst()//
                .orElseThrow(IOException::new);
            // Check for name collisions and show prompt if necessary
            if (localWorkspace.containsItemWithName(workflowGroupId, dirName)) {
                var sh = SWTUtilities.getActiveShell();
                var msg = String.format(
                    "The following workflow (group) already exist in \"%s\": %n%n%s %n%n"
                        + "Continue and automatically solve name collision by appending numbers?",
                    getWorkflowGroupName(workflowGroupId), dirName);
                return MessageDialog.openQuestion(sh, "Workflow (group) already exist", msg);
            } else {
                return true;
            }
        } catch (IOException e) {
            LOGGER.error(String.format("Could not unpack the workflow (group) at <%s>", archiveFilePath), e);
            return false;
        }
    }

    @Override
    protected List<SpaceItemEnt> importItems(final IProgressMonitor monitor,
        final String workflowGroupItemId, final List<Path> srcPaths) {
        monitor.beginTask(
            String.format("Importing %d files to \"%s\"", srcPaths.size(), getWorkflowGroupName(workflowGroupItemId)),
            IProgressMonitor.UNKNOWN);
        var archiveFilePath = srcPaths.get(0); // There can only be one
        List<SpaceItemEnt> importedSpaceItems;
        try {
            // Since this has `knime-workbench` dependencies, we cannot run it in `knime-gateway`.
            // So we create a consumer here and pass it.
            Consumer<Path> createMetaInfoFileFor = destPath -> {
                var metaInfoFile = new File(destPath.toFile(), WorkflowPersistor.METAINFO_FILE);
                if (!metaInfoFile.exists() || (metaInfoFile.length() == 0)) {
                    MetaInfoFile.createOrGetMetaInfoFileForDirectory(destPath.toFile(), false);
                }
            };
            var importedItem = LocalSpaceUtil.getLocalWorkspace().importWorkflows(archiveFilePath, workflowGroupItemId,
                createMetaInfoFileFor);
            importedSpaceItems = Collections.singletonList(importedItem);
        } catch (IOException e) {
            LOGGER.error(String.format("Could not import <%s>", archiveFilePath), e);
            importedSpaceItems = Collections.emptyList();
        }
        monitor.done();
        return importedSpaceItems;
    }

    @Override
    protected void showWarningWithTitleAndMessage() {
        DesktopAPUtil.showWarning("Workflow import", "Not all selected workflows could be imported");
    }

}
