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
 *   Feb 1, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import static org.knime.gateway.api.entity.EntityBuilderManager.builder;
import static org.knime.ui.java.api.DesktopAPI.MAPPER;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;

import org.eclipse.swt.widgets.Display;
import org.knime.core.node.NodeLogger;
import org.knime.core.ui.util.NodeTemplateId;
import org.knime.gateway.api.entity.NodeIDEnt;
import org.knime.gateway.api.webui.entity.AddNodeCommandEnt.AddNodeCommandEntBuilder;
import org.knime.gateway.api.webui.entity.NodeFactoryKeyEnt;
import org.knime.gateway.api.webui.entity.NodeFactoryKeyEnt.NodeFactoryKeyEntBuilder;
import org.knime.gateway.api.webui.entity.WorkflowCommandEnt.KindEnum;
import org.knime.gateway.api.webui.entity.XYEnt.XYEntBuilder;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NodeNotFoundException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.NotASubWorkflowException;
import org.knime.gateway.api.webui.service.util.ServiceExceptions.OperationNotAllowedException;
import org.knime.gateway.impl.service.util.EventConsumer;
import org.knime.gateway.impl.webui.service.DefaultNodeRepositoryService;
import org.knime.gateway.impl.webui.service.DefaultWorkflowService;
import org.knime.workbench.core.imports.EntityImport;
import org.knime.workbench.core.imports.ImportForbiddenException;
import org.knime.workbench.core.imports.NodeImport;
import org.knime.workbench.core.imports.URIImporterFinder;

import com.equo.chromium.swt.Browser;

/**
 * Utility methods for importing URIs (e.g. a node from a hub url).
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class ImportURI {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(ImportURI.class);

    private static EntityImport entityImportInProgress;

    private ImportURI() {
        // utility
    }

    /**
     * Helper to import objects (e.g. nodes) from a URI (e.g. a Hub-URL) into the App.
     *
     * @param browser the browser to import the object for
     * @param uriString the URI to import from
     * @return {@code true} if the import was successful
     */
    public static boolean importURI(final Browser browser, final String uriString) {
        entityImportInProgress = getEntityImport(uriString);
        if (entityImportInProgress != null) {
            var displayCursorLocation = Display.getCurrent().getCursorLocation();
            var browserCursorLocation = Display.getCurrent().map(null, browser, displayCursorLocation);
            return sendImportURIEvent(browserCursorLocation.x, browserCursorLocation.y);
        } else {
            return false;
        }
    }

    private static EntityImport getEntityImport(final String uriString) {
        try {
            var uri = new URI(uriString);
            return URIImporterFinder.getInstance().createEntityImportFor(uri).orElse(null);
        } catch (URISyntaxException | ImportForbiddenException e) {
            LOGGER.info("Can't import object from URI '" + uriString + "'", e);
            return null;
        }
    }

    private static boolean sendImportURIEvent(final int x, final int y) {
        var event = MAPPER.createObjectNode();
        event.put("x", x);
        event.put("y", y);
        DesktopAPI.getDeps(EventConsumer.class).accept("ImportURIEvent", event);
        return true;
    }

    static boolean importURIAtWorkflowCanvas(final String uri, final String projectId, final String workflowId,
        final int canvasX, final int canvasY) {
        EntityImport entityImport;
        if (uri == null) {
            entityImport = entityImportInProgress;
        } else {
            entityImport = getEntityImport(uri);
        }
        entityImportInProgress = null;

        if (entityImport instanceof NodeImport) {
            return importNode((NodeImport)entityImport, projectId, workflowId, canvasX, canvasY);
        }
        return false;
    }

    private static boolean importNode(final NodeImport nodeImport, final String projectId, final String workflowId,
        final int canvasX, final int canvasY) {
        NodeFactoryKeyEnt nodeFactoryKey;
        if (nodeImport.isDynamicNode()) {
            var templateId = NodeTemplateId.ofDynamicNodeFactory(nodeImport.getCanonicalNodeFactory(),
                nodeImport.getNodeName(), true);
            nodeFactoryKey = DefaultNodeRepositoryService.getInstance().getNodeTemplates(List.of(templateId))
                .get(templateId).getNodeFactory();
        } else {
            nodeFactoryKey =
                builder(NodeFactoryKeyEntBuilder.class).setClassName(nodeImport.getCanonicalNodeFactory()).build();
        }
        var addNodeCommand = builder(AddNodeCommandEntBuilder.class) //
            .setKind(KindEnum.ADD_NODE) //
            .setNodeFactory(nodeFactoryKey) //
            .setPosition(builder(XYEntBuilder.class).setX(canvasX).setY(canvasY).build()) //
            .build();
        try {
            DefaultWorkflowService.getInstance().executeWorkflowCommand(projectId, new NodeIDEnt(workflowId),
                addNodeCommand);
            return true;
        } catch (NotASubWorkflowException | NodeNotFoundException | OperationNotAllowedException e) {
            LOGGER.warn("Failed to add node '" + nodeImport.getCanonicalNodeFactory() + "'", e);
            return false;
        }
    }

}
