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
 *   Sep 8, 2023 (kai): created
 */
package org.knime.ui.java.api;

import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NodeNotFoundException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NotASubWorkflowException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.OperationNotAllowedException;
import org.knime.gateway.impl.service.util.DefaultServiceUtil;
import org.knime.gateway.impl.webui.WorkflowKey;

/**
 * API for component related desktop functions
 *
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class ComponentAPI {

    private ComponentAPI() {
        // Stateless
    }

    /**
     * Opens a Swing dialog to link a component
     *
     * @param projectId
     * @param rootWorkflowId
     * @param nodeId
     *
     * @return {@true} if the operation was successful, {@code false} otherwise
     * @throws OperationNotAllowedException
     */
    @API
    static boolean openLinkComponentDialog(final String projectId, final String rootWorkflowId, final String nodeId)
        throws OperationNotAllowedException {
        final var component = assertIsWritableAndGetComponent(projectId, nodeId);
        final var wfKey = getWorkflowKey(projectId, rootWorkflowId);
        return ManipulateComponents.openLinkComponentDialog(component, wfKey);
    }

    /**
     * Updates a linked component to the latest version
     *
     * @param projectId
     * @param rootWorkflowId
     * @param nodeId
     *
     * @throws OperationNotAllowedException
     * @throws NotASubWorkflowException
     * @throws NodeNotFoundException
     */
    @API
    static void updateComponent(final String projectId, final String rootWorkflowId, final String nodeId)
        throws OperationNotAllowedException, NotASubWorkflowException, NodeNotFoundException {
        final var component = assertIsWritableAndGetComponent(projectId, nodeId);
        final var wfKey = getWorkflowKey(projectId, rootWorkflowId);
        ManipulateComponents.updateComponent(component, wfKey);
    }

    /**
     * Opens a components link type dialog, only available for absolute links.
     *
     * @param projectId
     * @param rootWorkflowId
     * @param nodeId
     *
     * @throws OperationNotAllowedException
     * @throws NotASubWorkflowException
     * @throws NodeNotFoundException
     */
    @API
    static void openChangeComponentLinkTypeDialog(final String projectId, final String rootWorkflowId,
        final String nodeId) throws OperationNotAllowedException, NotASubWorkflowException, NodeNotFoundException {
        final var component = assertIsWritableAndGetComponent(projectId, nodeId);
        final var wfKey = getWorkflowKey(projectId, rootWorkflowId);
        ManipulateComponents.openChangeComponentLinkTypeDialog(component, wfKey);
    }

    /**
     * Opens a Java dialog to change the Hub item version of a component.
     *
     * @param projectId
     * @param rootWorkflowId
     * @param nodeId
     *
     * @throws OperationNotAllowedException
     * @throws NotASubWorkflowException
     * @throws NodeNotFoundException
     */
    @API
    static void openChangeComponentHubItemVersionDialog(final String projectId, final String rootWorkflowId,
        final String nodeId) throws OperationNotAllowedException, NotASubWorkflowException, NodeNotFoundException {
        final var component = assertIsWritableAndGetComponent(projectId, nodeId);
        final var wfKey = getWorkflowKey(projectId, rootWorkflowId);
        ManipulateComponents.openChangeComponentHubItemVersionDialog(component, wfKey);
    }

    private static SubNodeContainer assertIsWritableAndGetComponent(final String projectId, final String nodeId)
        throws OperationNotAllowedException {
        final var nc = DefaultServiceUtil.getNodeContainer(projectId, new NodeIDEnt(nodeId));
        final var wfm = nc.getParent();
        if (wfm.isWriteProtected()) {
            throw new OperationNotAllowedException("Container is read-only.");
        }

        if (!(nc instanceof SubNodeContainer)) {
            throw new OperationNotAllowedException("Not a component: " + nodeId);
        }
        return (SubNodeContainer)nc;
    }

    private static WorkflowKey getWorkflowKey(final String projectId, final String rootWorkflowId) {
        return new WorkflowKey(projectId, new NodeIDEnt(rootWorkflowId));
    }
}
