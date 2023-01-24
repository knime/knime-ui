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
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.util.Optional;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.FileDialog;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.core.util.FileUtil;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.gateway.impl.webui.LocalWorkspace;
import org.knime.ui.java.util.DesktopAPUtil;

import com.equo.chromium.swt.Browser;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Import data files into a workspace and save them to the specified location.
 *
 * @author Kai Franze, KNIME GmbH
 */
public class ImportFilesBrowserFunction extends AbstractImportBrowserFunction {

    private static final String FUNCTION_NAME = "importFiles";

    @SuppressWarnings("javadoc")
    public ImportFilesBrowserFunction(final Browser browser, final ObjectMapper mapper) {
        super(browser, FUNCTION_NAME, mapper);
    }

    @Override
    protected FileDialog getFileDialog() {
        return new FileDialog(SWTUtilities.getActiveShell(), SWT.MULTI);
    }

    @Override
    protected void showWarningWithTitleAndMessage() {
        DesktopAPUtil.showWarning("File import", "Not all selected files could be imported");
    }

    @Override
    protected Optional<SpaceItemEnt> importItem(final Path srcPath, final String destItemId) {
        var localWorkspace = getLocalWorkspace();
        var parentWorkflowGroupPath = localWorkspace.getAbsolutePath(destItemId);
        var destPathOptional = generateUniqueSpaceItemPath(parentWorkflowGroupPath, srcPath.getFileName().toString());
        return destPathOptional.flatMap(destPath -> DesktopAPUtil.runWithProgress("Import file", getLogger(),
            monitor -> functionToRunWithProgress(monitor, srcPath, destPath, localWorkspace)));
    }

    private static SpaceItemEnt functionToRunWithProgress(final IProgressMonitor monitor, final Path srcPath,
        final Path destPath, final LocalWorkspace localWorkspace) {
        try {
            monitor.beginTask(String.format("Importing <%s>...", destPath.getFileName()), IProgressMonitor.UNKNOWN);
            FileUtil.copy(srcPath.toFile(), destPath.toFile());
            monitor.done();
            return localWorkspace.getSpaceItemEntFromPath(destPath);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
