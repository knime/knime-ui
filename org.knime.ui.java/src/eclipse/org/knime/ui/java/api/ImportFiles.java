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
package org.knime.ui.java.api;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.swt.SWT;
import org.eclipse.swt.widgets.FileDialog;
import org.knime.core.node.CanceledExecutionException;
import org.knime.core.node.NodeLogger;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.api.service.GatewayException;
import org.knime.gateway.api.webui.entity.SpaceItemEnt;
import org.knime.gateway.api.webui.service.util.MutableServiceCallException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.LoggedOutException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NetworkException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.ServiceCallException;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.Space.NameCollisionHandling;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.ui.java.api.NameCollisionChecker.UsageContext;
import org.knime.ui.java.util.DesktopAPUtil;

/**
 * Import data files into a space and save them to the specified location.
 *
 * @author Kai Franze, KNIME GmbH
 */
class ImportFiles extends AbstractImportItems {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(ImportFiles.class);

    @Override
    protected FileDialog getFileDialog() {
        return new FileDialog(SWTUtilities.getActiveShell(), SWT.MULTI);
    }

    @Override
    protected Optional<NameCollisionHandling> checkForNameCollisionsAndSuggestSolution(final Space space,
        final String workflowGroupItemId, final List<Path> srcPaths)
        throws NetworkException, LoggedOutException, ServiceCallException {

        try {
            final var nameCollisions =
                NameCollisionChecker.checkForNameCollisions(space, workflowGroupItemId, srcPaths);
            if (nameCollisions.isEmpty()) {
                return Optional.of(NameCollisionHandling.NOOP);
            } else {
                return NameCollisionChecker.openDialogToSelectCollisionHandling(space, workflowGroupItemId,
                    nameCollisions, UsageContext.IMPORT);
            }
        } catch (final MutableServiceCallException e) {
            throw e.toGatewayException("Failed to import file(s)");
        }
    }

    @Override
    protected List<SpaceItemEnt> importItems(final IProgressMonitor monitor, final Space space,
        final String workflowGroupItemId, final List<Path> srcPaths,
        final Space.NameCollisionHandling collisionHandling) {
        String name;
        try {
            name = space instanceof LocalSpace local ? local.getItemName(workflowGroupItemId) : space.getName();
        } catch (MutableServiceCallException e) {
            LOGGER.error(e);
            name = "unknown";
        }

        monitor.beginTask(String.format("Importing %d files into \"%s\"", srcPaths.size(), name),
            IProgressMonitor.UNKNOWN);
        final List<SpaceItemEnt> importedSpaceItems = new ArrayList<>();

        for (final var srcPath : srcPaths) {
            try {
                importedSpaceItems.add(space.importFile(srcPath, workflowGroupItemId, collisionHandling, monitor));
            } catch (GatewayException e) { // TODO NXT-3938 react to workflow load exceptions
                LOGGER.error(String.format("Could not import <%s>", srcPath), e);
                return null;
            } catch (MutableServiceCallException e) {
                LOGGER.error(String.format("Could not import <%s>", srcPath), e.toGatewayException("Import failed"));
                return null;
            } catch (CanceledExecutionException e) {
                LOGGER.error(String.format("Canceled not import <%s>", srcPath), e);
                return null;
            }

        }
        monitor.done();
        return importedSpaceItems;
    }

    @Override
    protected void showWarningWithTitleAndMessage() {
        DesktopAPUtil.showWarning("File import", "Not all selected files could be imported");
    }

}
