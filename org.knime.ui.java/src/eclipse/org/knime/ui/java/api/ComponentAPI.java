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

import java.security.NoSuchAlgorithmException;

import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.jface.window.Window;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.core.ui.util.SWTUtilities;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.api.service.GatewayException;
import org.knime.gateway.api.util.CoreUtil;
import org.knime.gateway.api.util.CoreUtil.ContainerType;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.OperationNotAllowedException;
import org.knime.gateway.impl.service.util.DefaultServiceUtil;
import org.knime.gateway.impl.webui.WorkflowKey;
import org.knime.workbench.editor2.actions.LockMetaNodeDialog;
import org.knime.workbench.editor2.editparts.GUIWorkflowCipherPrompt;

/**
 * API for component related desktop functions
 *
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class ComponentAPI {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(ComponentAPI.class);

    private ComponentAPI() {
        // Stateless
    }


    /**
     * Opens a Java dialog to change the Hub item version of a component.
     *
     * @param projectId
     * @param rootWorkflowId
     * @param nodeId
     *
     * @throws GatewayException
     */
    @API
    static void openChangeComponentHubItemVersionDialog(final String projectId, final String rootWorkflowId,
        final String nodeId) throws GatewayException {

        final var component = assertIsWritableAndGetComponent(projectId, nodeId);
        final var wfKey = getWorkflowKey(projectId, rootWorkflowId);
        ManipulateComponents.openChangeComponentHubItemVersionDialog(component, wfKey);
    }

    /**
     * Opens a java dialog to set a lock with password on a component or metanode
     *
     * @param projectId
     * @param nodeId
     *
     * @throws OperationNotAllowedException
     */
    @API
    static void openLockSubnodeDialog(final String projectId, final String nodeId) throws GatewayException {
        final var nc = DefaultServiceUtil.getNodeContainer(projectId, new NodeIDEnt(nodeId));
        final var containerTypeAndWfm = CoreUtil.getTypeAndContainedWfm(nc).orElseThrow(
            () -> OperationNotAllowedException.builder() //
                .withTitle("Failed to open dialog") //
                .withDetails("Not a component nor a metanode: " + nc.getNameWithID()) //
                .canCopy(false) //
                .build());
        final var containerType = containerTypeAndWfm.getFirst();
        final var wfm = containerTypeAndWfm.getSecond();

        // The following code is a copy from LockMetaNodeAction.java from KNIME-Workbench
        // The action is not called directly as it requires an active workbench
        if (!wfm.unlock(new GUIWorkflowCipherPrompt(containerType == ContainerType.COMPONENT))) {
            return;
        }
        final var shell = SWTUtilities.getActiveShell();
        var lockDialog = new LockMetaNodeDialog(shell, wfm, containerType == ContainerType.COMPONENT);
        if (lockDialog.open() != Window.OK) {
            return;
        }
        String password = lockDialog.getPassword();
        String hint = lockDialog.getPasswordHint();
        try {
            wfm.setWorkflowPassword(password, hint);
        } catch (NoSuchAlgorithmException e) {
            String msg = "Unable to encrypt Component: " + e.getMessage();
            LOGGER.error(msg, e);
            MessageDialog.openError(shell, "Component encrypt", msg);
        }
    }

    /**
     * Unlocks a locked Subnode, it shows a prompt to enter a password and returns true if the node was unlocked or
     * false if the prompt was canceled
     *
     * @param projectId
     * @param nodeId
     *
     * @throws OperationNotAllowedException
     */
    @API
    static boolean unlockSubnode(final String projectId, final String nodeId) throws GatewayException {
        final var nc = DefaultServiceUtil.getNodeContainer(projectId, new NodeIDEnt(nodeId));
        return CoreUtil.getTypeAndContainedWfm(nc)
            .map(containerTypeAndWfm -> containerTypeAndWfm.getSecond()
                .unlock(new GUIWorkflowCipherPrompt(containerTypeAndWfm.getFirst() == ContainerType.COMPONENT)))
            .orElseThrow(() -> OperationNotAllowedException.builder() //
                .withTitle("Failed to unlock") //
                .withDetails("Not a component nor a metanode: " + nc.getNameWithID()) //
                .canCopy(false) //
                .build());
    }

    private static SubNodeContainer assertIsWritableAndGetComponent(final String projectId, final String nodeId)
        throws GatewayException {
        final var nc = DefaultServiceUtil.getNodeContainer(projectId, new NodeIDEnt(nodeId));
        final var wfm = nc.getParent();
        if (wfm.isWriteProtected()) {
            throw OperationNotAllowedException.builder() //
                .withTitle("Operation not allowed") //
                .withDetails("Container is read-only: " + nc.getNameWithID()) //
                .canCopy(false) //
                .build();
        }

        if (!(nc instanceof SubNodeContainer)) {
            throw OperationNotAllowedException.builder() //
                .withTitle("Operation not allowed") //
                .withDetails("Not a component: " + nc.getNameWithID()) //
                .canCopy(false) //
                .build();
        }
        return (SubNodeContainer)nc;
    }

    private static WorkflowKey getWorkflowKey(final String projectId, final String rootWorkflowId) {
        return new WorkflowKey(projectId, new NodeIDEnt(rootWorkflowId));
    }
}
