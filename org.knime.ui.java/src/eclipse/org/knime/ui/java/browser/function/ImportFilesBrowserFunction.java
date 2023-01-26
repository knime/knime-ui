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
 *   Jan 11, 2023 (kai): created
 */
package org.knime.ui.java.browser.function;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.FileDialog;
import org.knime.core.node.NodeLogger;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.ui.java.util.DesktopAPUtil;
import org.knime.ui.java.util.LocalSpaceUtil;

import com.equo.chromium.swt.Browser;

/**
 * Import data files into a workspace and save them to the specified location.
 *
 * @author Kai Franze, KNIME GmbH
 */
public class ImportFilesBrowserFunction extends AbstractImportBrowserFunction {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(ImportFilesBrowserFunction.class);

    private static final String FUNCTION_NAME = "importFiles";

    @SuppressWarnings("javadoc")
    public ImportFilesBrowserFunction(final Browser browser) {
        super(browser, FUNCTION_NAME);
    }

    @Override
    protected FileDialog getFileDialog() {
        return new FileDialog(SWTUtilities.getActiveShell(), SWT.MULTI);
    }

    @Override
    protected boolean checkForNameCollisionsAndSuggestSolution(final String workflowGroupId,
        final List<Path> srcPaths) {
        var nameCollisionChecker =
            LocalSpaceUtil.getLocalWorkspace().getNameCollisionCheckerForWorkflowGroup(workflowGroupId);
        var existingFileNames = srcPaths.stream()//
            .map(Path::getFileName)//
            .map(Path::toString)//
            .filter(nameCollisionChecker)//
            .collect(Collectors.joining("\n"));
        if (existingFileNames.isEmpty()) {
            return true;
        } else {
            var sh = SWTUtilities.getActiveShell();
            var msg = String.format(
                "The following items already exist in \"%s\": %n%n%s %n%n"
                    + "Continue and automatically solve name collision by appending numbers?",
                getWorkflowGroupName(workflowGroupId), existingFileNames);
            return MessageDialog.openQuestion(sh, "Files already exist", msg);
        }
    }

    @Override
    protected List<SpaceItemEnt> functionToRunWithProgress(final IProgressMonitor monitor,
        final String workflowGroupItemId, final List<Path> srcPaths) {
        monitor.beginTask(
            String.format("Importing %d files to \"%s\"", srcPaths.size(), getWorkflowGroupName(workflowGroupItemId)),
            IProgressMonitor.UNKNOWN);
        var importedSpaceItems = srcPaths.stream()//
            .map(srcPath -> { // Import every single file
                try {
                    return LocalSpaceUtil.getLocalWorkspace().importFile(srcPath, workflowGroupItemId);
                } catch (IOException e) {
                    LOGGER.error(String.format("Could not import <%s>", srcPath), e);
                    return null;
                }
            })//
            .filter(Objects::nonNull) // Exclude the failed ones from the result
            .collect(Collectors.toList());
        monitor.done();
        return importedSpaceItems;
    }

    @Override
    protected void showWarningWithTitleAndMessage() {
        DesktopAPUtil.showWarning("File import", "Not all selected files could be imported");
    }

}
