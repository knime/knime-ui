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
import java.net.URI;
import java.util.function.Supplier;

import org.eclipse.swt.widgets.Display;
import org.knime.core.node.workflow.NodeID;
import org.knime.core.node.workflow.NodeTimer;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.ServiceCallException;
import org.knime.gateway.impl.service.util.DefaultServiceUtil;
import org.knime.gateway.impl.webui.WorkflowKey;
import org.knime.gateway.impl.webui.WorkflowMiddleware;
import org.knime.gateway.impl.webui.service.commands.WorkflowCommand;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.workbench.editor2.commands.CreateMetaNodeTemplateCommand;

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
     * Import workflows into a space and save them to the specified location.
     *
     * @return the ids of the imported items or {@code null} if the import failed
     */
    @API
    static String[] importWorkflows(final String spaceProviderId, final String spaceId, final String itemId)
        throws IOException {
        final var space = DesktopAPI.getSpace(spaceProviderId, spaceId);
        var itemIds = IMPORT_WORKFLOWS.importItems(space, itemId);
        if (itemIds != null && itemIds.length > 0) {
            NodeTimer.GLOBAL_TIMER.incWorkflowImport();
        }
        return itemIds;
    }

    /**
     * Import data files into a space and save them to the specified location.
     *
     * @return the ids of the imported items or {@code null} if the import failed
     */
    @API
    static String[] importFiles(final String spaceProviderId, final String spaceId, final String itemId)
        throws IOException {
        final var space = DesktopAPI.getSpace(spaceProviderId, spaceId);
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

    /**
     * Imports a component from a space into a workflow.
     *
     * @param spaceProviderId The space provider of the workflow to import into
     * @param spaceId The space of the workflow to import into
     * @param itemId The item ID of the workflow to import into
     * @param x X-Position to place the component in the workflow canvas
     * @param y Y-Position to place the component in the workflow canvas
     * @return the node-id of the new component or {@code null} if the import failed
     */
    @API
    static String importComponent(final String spaceProviderId, final String spaceId, final String itemId,
        final String projectId, final String workflowId, final double x, final double y) {
        var space = DesktopAPI.getSpace(spaceProviderId, spaceId);
        var uri = space.toKnimeUrl(itemId);
        var isRemoteLocation = !SpaceProvider.LOCAL_SPACE_PROVIDER_ID.equals(spaceProviderId);
        return importComponent(projectId, workflowId, uri, isRemoteLocation, x, y);
    }

    /**
     * Imports a component from a given URI into a workflow.
     *
     * @param projectId The project to import into
     * @param workflowId The workflow to import into
     * @param uri The URI of the component template
     * @param isRemoteLocation Whether the component template is from a remote location
     * @param x X-Position to place the component in the workflow canvas
     * @param y Y-Position to place the component in the workflow canvas
     * @return the node-id of the new component or {@code null} if the import failed
     */
    static String importComponent(final String projectId, final String workflowId, final URI uri,
            final boolean isRemoteLocation, final double x, final double y) {
        var workflowIdEnt = new NodeIDEnt(workflowId);
        Supplier<WorkflowManager> wfmSupplier = () -> DefaultServiceUtil.getWorkflowManager(projectId, workflowIdEnt);
        Supplier<NodeID> command = () -> Display.getDefault().syncCall(() -> {
            var snc = CreateMetaNodeTemplateCommand.createMetaNodeTemplate(wfmSupplier.get(), uri, (int)x, (int)y,
                isRemoteLocation, false);
            return snc == null ? null : snc.getID();
        });
        var componentId = command.get();
        if (componentId == null) {
            return null;
        }

        // execute pseudo-command to enable undo and redo
        var commands = DesktopAPI.getDeps(WorkflowMiddleware.class).getCommands();
        commands.setCommandToExecute(new AddComponentCommand(wfmSupplier, componentId, command));
        try {
            commands.execute(new WorkflowKey(projectId, workflowIdEnt), null);
        } catch (ServiceCallException e) { // NOSONAR
            // will never happen since the workflow has already been resolved above and the command-execute does nothing
        }

        return componentId.toString();
    }

    /**
     * Pseudo-command implementation which carries out the undo and redo after a component has been added.
     */
    private static class AddComponentCommand implements WorkflowCommand {

        private NodeID m_componentId;

        private final Supplier<NodeID> m_redo;

        private final Supplier<WorkflowManager> m_wfm;

        AddComponentCommand(final Supplier<WorkflowManager> wfm, final NodeID componentId,
            final Supplier<NodeID> redo) {
            m_wfm = wfm;
            m_componentId = componentId;
            m_redo = redo;
        }

        @Override
        public boolean execute(final WorkflowKey wfKey) {
            return true;
        }

        @Override
        public boolean canUndo() {
            return m_wfm.get().canRemoveNode(m_componentId);
        }

        @Override
        public void undo() {
            m_wfm.get().removeNode(m_componentId);
            m_componentId = null;
        }

        @Override
        public boolean canRedo() {
            return true;
        }

        @Override
        public void redo() {
            m_componentId = m_redo.get();
        }

    }

}
