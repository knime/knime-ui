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

import static org.knime.core.ui.wrapper.NodeContainerWrapper.wrap;

import javax.swing.SwingUtilities;

import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.PlatformUI;
import org.knime.core.node.Node;
import org.knime.core.node.NodeLogger;
import org.knime.core.node.util.CheckUtils;
import org.knime.core.node.workflow.NativeNodeContainer;
import org.knime.core.node.workflow.NodeContainer;
import org.knime.core.node.workflow.NodeStateChangeListener;
import org.knime.core.node.workflow.NodeStateEvent;
import org.knime.core.node.workflow.SubNodeContainer;
import org.knime.core.node.workflow.WorkflowManager;
import org.knime.core.ui.wrapper.NativeNodeContainerWrapper;
import org.knime.core.webui.node.view.NodeViewManager;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.api.util.VersionId;
import org.knime.gateway.impl.service.util.DefaultServiceUtil;
import org.knime.js.cef.nodeview.CEFNodeView;
import org.knime.ui.java.prefs.KnimeUIPreferences;
import org.knime.workbench.editor2.actions.OpenInteractiveWebViewAction;
import org.knime.workbench.editor2.actions.OpenNodeViewAction;
import org.knime.workbench.editor2.actions.OpenSubnodeWebViewAction;
import org.knime.workbench.editor2.actions.SubnodeLayoutAction;
import org.knime.workbench.editor2.editparts.NodeContainerEditPart;

/**
 * Functions around nodes.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 * @author Kai Franze, KNIME GmbH, Germany
 */
final class NodeAPI {

    private NodeAPI() {
        // stateless
    }

    /**
     * Opens the swing dialog or CEF-based dialog of a node.
     *
     * @param projectId
     * @param versionId
     * @param nodeId
     * @return whether the node settings have changed
     */
    @API
    static boolean openNodeDialog(final String projectId, final String versionId, final String nodeId) {
        var version = VersionId.parse(versionId);
        var nodeIdEnt = new NodeIDEnt(nodeId);
        final var nc = DefaultServiceUtil.getNodeContainer(projectId, version, nodeIdEnt);
        checkIsNotNull(nc, projectId, nodeId);
        var oldSettings = nc.getNodeSettings();
        NodeContainerEditPart.openNodeDialog(wrap(nc));
        return !oldSettings.equals(nc.getNodeSettings());
    }

    /**
     * @param confirmNodeConfigChanges whether to always confirm node configuration changes (e.g. when selecting another
     *            node)
     */
    @API
    static void setConfirmNodeConfigChangesPreference(final boolean confirmNodeConfigChanges) {
        KnimeUIPreferences.confirmNodeConfigChanges(confirmNodeConfigChanges);
    }

    /**
     * Executes the node and opens the node view as soon as the node is executed.
     *
     * @param projectId
     * @param nodeId
     */
    @API
    static void executeNodeAndOpenView(final String projectId, final String nodeId) {
        executeNodeThenRun(projectId, nodeId, () -> NodeAPI.openNodeView(projectId, nodeId));
    }

    /**
     * If the node is already executed, run the given task. If the node is not already executed, execute the workflow up
     * to the node and attach a listener to run the given task once executed.
     *
     * @param projectId The project containing the workflow
     * @param nodeId The node to act on
     * @param task The task to run
     */
    static void executeNodeThenRun(final String projectId, final String nodeId, final Runnable task) {
        final var nc = DefaultServiceUtil.getNodeContainer(projectId, new NodeIDEnt(nodeId));
        checkIsNotNull(nc, projectId, nodeId);

        if (nc.getNodeContainerState().isExecuted()) {
            task.run();
            return;
        }
        nc.addNodeStateChangeListener(new NodeStateChangeListener() {
            @Override
            public void stateChanged(final NodeStateEvent event) {
                var state = nc.getNodeContainerState();
                if (event.getSource().equals(nc.getID()) && state.isExecuted()) {
                    Display.getDefault().asyncExec(task);
                }
                if (!state.isExecutionInProgress()) {
                    nc.removeNodeStateChangeListener(this);
                }
            }
        });
        nc.getParent().executeUpToHere(nc.getID());
    }

    /**
     * Opens the node's js-view, if available, in an extra browser window.
     *
     * @param projectId
     * @param nodeId
     */
    private static void openNodeView(final String projectId, final String nodeId) {
        final var nc = DefaultServiceUtil.getNodeContainer(projectId, new NodeIDEnt(nodeId));
        checkIsNotNull(nc, projectId, nodeId);
        if (nc instanceof SubNodeContainer snc) {
            // composite view
            OpenSubnodeWebViewAction.openView(snc);
        } else if (NodeViewManager.hasNodeView(nc)) {
            // 'ui-extension' view
            final var nnc = ((NativeNodeContainer)nc);
            final var viewName = "Interactive View: " + nnc.getNodeViewName(0);
            OpenNodeViewAction.openNodeView(wrap(nnc),
                new CEFNodeView(NativeNodeContainerWrapper.wrap(nnc), false, true), viewName);
        } else if (nc.getInteractiveWebViews().size() > 0 || nc.hasInteractiveView()) {
            // legacy js-view
            OpenInteractiveWebViewAction.openView((NativeNodeContainer)nc,
                nc.getInteractiveWebViews().get(0).getViewName());
        } else if (nc.getNrNodeViews() > 0) {
            // swing-based view
            final var title = nc.getViewName(0) + " - " + nc.getDisplayLabel();
            final var knimeWindowBounds = getAppBoundsAsAWTRec();
            SwingUtilities.invokeLater(() -> Node.invokeOpenView(nc.getView(0), title, knimeWindowBounds));
        } else {
            NodeLogger.getLogger(NodeAPI.class).warnWithFormat(
                "Node with id '%s' in workflow '%s' does not have a node view", nc.getID(), nc.getParent().getName());
        }
    }

    static java.awt.Rectangle getAppBoundsAsAWTRec() {
        final var knimeWindowBounds = PlatformUI.getWorkbench().getActiveWorkbenchWindow().getShell().getBounds();
        return new java.awt.Rectangle(knimeWindowBounds.x, knimeWindowBounds.y, knimeWindowBounds.width,
            knimeWindowBounds.height);
    }

    /**
     * Opens the swing dialog or CEF-based dialog of a node.
     */
    @API
    static void openLegacyFlowVariableDialog(final String projectId, final String nodeId) {
        final var nc = DefaultServiceUtil.getNodeContainer(projectId, new NodeIDEnt(nodeId));
        checkIsNotNull(nc, projectId, nodeId);
        NodeContainerEditPart.openDialog(wrap(nc), null);
    }

    /**
     *
     * Opens the layout editor of a component
     *
     * @param projectId
     * @param nodeId
     * @return
     */
    @API
    static String openLayoutEditor(final String projectId, final String nodeId) {
        var nc = DefaultServiceUtil.getNodeContainer(projectId, new NodeIDEnt(nodeId));
        checkIsNotNull(nc, projectId, nodeId);
        if (nc instanceof WorkflowManager wfm && wfm.isComponentProjectWFM()) {
            nc = (NodeContainer)wfm.getDirectNCParent();
        }
        if (nc instanceof SubNodeContainer subnode) {
            SubnodeLayoutAction.openLayoutEditor(subnode);
            return null;
        } else {
            final var message = String.format("There is no layout editor for node '%s'", nc);
            NodeLogger.getLogger(NodeAPI.class).warn(message);
            return message;
        }
    }

    static void checkIsNotNull(final NodeContainer nc, final String projectId, final String nodeId) {
        CheckUtils.checkArgument(nc != null, "Node with id '%s' not found in workflow with id '%s'", projectId, nodeId);
    }
}
