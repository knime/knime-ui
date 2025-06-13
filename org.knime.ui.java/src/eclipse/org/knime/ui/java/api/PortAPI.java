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
 *   Aug 3, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import static org.knime.core.ui.wrapper.NodeContainerWrapper.wrap;
import static org.knime.ui.java.api.NodeAPI.checkIsNotNull;
import static org.knime.ui.java.api.NodeAPI.getAppBoundsAsAWTRec;

import java.io.IOException;

import org.eclipse.swt.widgets.Display;
import org.knime.core.webui.node.port.PortViewManager;
import org.knime.core.webui.node.port.PortViewManager.PortViewDescriptor;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.api.util.CoreUtil;
import org.knime.gateway.impl.service.util.DefaultServiceUtil;
import org.knime.js.cef.nodeview.CEFNodeView;
import org.knime.workbench.editor2.actions.OpenNodeViewAction;

/**
 * Functions around ports.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class PortAPI {

    private PortAPI() {
        // stateless
    }

    /**
     * Opens the port view for the given port in a separate browser window.
     *
     * @param projectId the workflow project that contains the node to open the port view for
     * @param nodeId the id of the node to open the port view for
     * @param portIdx the port index to open the port view for
     * @param viewIdx the view index (a port type can have multiple views)
     * @throws IOException in case the {@link CEFNodeView} couldn't be instantiated
     */
    @API
    static void openPortView(final String projectId, final String nodeId, final Double portIdx, final Double viewIdx)
        throws IOException {
        var nc = DefaultServiceUtil.getNodeContainer(projectId, new NodeIDEnt(nodeId));
        var view = new CEFNodeView(nc, portIdx.intValue(), viewIdx.intValue());
        var port = nc.getOutPort(portIdx.intValue());
        var viewName = PortViewManager.getPortViewDescriptor(port.getPortType(), viewIdx.intValue())
            .map(PortViewDescriptor::label).orElse(null);
        var name = port.getPortName() + (viewName == null ? "" : (" (" + viewName + ")"));
        Display.getDefault().asyncExec(() -> OpenNodeViewAction.openNodeView(wrap(nc), view, name));
    }

    /**
     * Open a legacy port view in a separate swing-window.
     *
     * @param projectId
     * @param nodeId
     * @param portIdx
     * @param execute whether to execute and wait until the node is executed before opening the legacy port view
     */
    @API
    static void openLegacyPortView(final String projectId, final String nodeId, final Double portIdx,
        final Boolean execute) {
        final var nc = DefaultServiceUtil.getNodeContainer(projectId, new NodeIDEnt(nodeId));
        checkIsNotNull(nc, projectId, nodeId);
        if (nc.isInactive()) {
            return;
        }
        Runnable openPortView = () -> {
            var port = nc.getOutPort(portIdx.intValue());
            port.openPortView(port.getPortName(), getAppBoundsAsAWTRec());
        };
        if (Boolean.TRUE.equals(execute)) {
            CoreUtil.executeThenRun(nc, openPortView);
        } else {
            openPortView.run();
        }
    }
}
