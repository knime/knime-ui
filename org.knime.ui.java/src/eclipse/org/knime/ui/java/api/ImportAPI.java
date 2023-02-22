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

import java.io.IOException;

import org.knime.core.node.workflow.NodeTimer;
import org.knime.gateway.impl.webui.spaces.SpaceProviders;

/**
 * Functions around importing stuff.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class ImportAPI {

    private static final ImportWorkflows IMPORT_WORKFLOWS = new ImportWorkflows();

    private static final ImportFiles IMPORT_FILES = new ImportFiles();

    private ImportAPI() {
        // stateless
    }

    /**
     * Import workflows into a workspace and save them to the specified location.
     *
     * @return Success state
     */
    @API
    static boolean importWorkflows(final String spaceProviderId, final String spaceId, final String itemId)
            throws IOException {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        var success = IMPORT_WORKFLOWS.importItems(space, itemId);
        if (success) {
            NodeTimer.GLOBAL_TIMER.incWorkflowImport();
        }
        return success;
    }

    /**
     * Import data files into a workspace and save them to the specified location.
     *
     * @return Success state
     */
    @API
    static boolean importFiles(final String spaceProviderId, final String spaceId, final String itemId)
            throws IOException {
        final var space = SpaceProviders.getSpace(DesktopAPI.getDeps(SpaceProviders.class), spaceProviderId, spaceId);
        return IMPORT_FILES.importItems(space, itemId);
    }

    /**
     * Imports a URI at a certain position in the workflow canvas (i.e. usually imported as a new node). If a node is to
     * be imported and the node isn't installed yet, it will ask the user whether to install the respective extension.
     *
     * @return {@code true} if the import was successful, otherwise {@code false}
     */
    @API
    static boolean importURIAtWorkflowCanvas(final String uri, final String projectId, final String workflowId,
        final double canvasX, final double canvasY) {
        return ImportURI.importURIAtWorkflowCanvas(uri, projectId, workflowId, (int)canvasX, (int)canvasY);
    }

}
