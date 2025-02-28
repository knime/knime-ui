/*
 * ------------------------------------------------------------------------
 *
 *  Copyright by KNIME AG, Zurich, Switzerland
 *  Website: http://www.knime.org; Email: contact@knime.org
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
 *   Feb 28, 2023 (hornm): created
 */
package org.knime.ui.java.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.endsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.function.Supplier;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.knime.core.node.exec.dataexchange.in.PortObjectInNodeFactory;
import org.knime.core.util.FileUtil;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.impl.project.Origin;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.NodeFactoryProvider;
import org.knime.gateway.impl.webui.WorkflowMiddleware;
import org.knime.gateway.impl.webui.service.ServiceDependencies;
import org.knime.gateway.impl.webui.service.ServiceInstances;
import org.knime.gateway.impl.webui.service.events.EventConsumer;
import org.knime.testing.util.WorkflowManagerUtil;

/**
 * Tests methods in {@link ImportURI}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
class ImportURITest {

    @Test
    void testImportURI() throws IOException {
        Supplier<int[]> cursorLocationSupplier = () -> new int[]{102, 99};
        var eventConsumer = mock(EventConsumer.class);
        DesktopAPI.injectDependency(eventConsumer);

        var success = ImportURI.importURI(cursorLocationSupplier, "test://domain/resource");
        assertThat(success).isTrue();
        verify(eventConsumer).accept("ImportURIEvent", DesktopAPI.MAPPER.readTree("{\"x\":102,\"y\":99}"));

        success = ImportURI.importURI(cursorLocationSupplier, "invalid://domain/resource");
        assertThat(success).isFalse();

        var file = FileUtil.createTempFile("uri_import_test", ".txt");
        success = ImportURI.importURI(cursorLocationSupplier, file.toURI().toString());
        assertThat(success).isTrue();

        importURIAtWorkflowCanvasAndAssert(null);
    }

    @Test
    void testImportURIAtWorkflowCanvas() throws IOException {
        var file = FileUtil.createTempFile("uri_import_test", ".txt");
        importURIAtWorkflowCanvasAndAssert(file.getAbsolutePath());
        importURIAtWorkflowCanvasAndAssert(file.toURI().toString());
    }

    private static void importURIAtWorkflowCanvasAndAssert(final String uri) throws IOException {
        var projectId = "projectId";
        try {
            var wfm = WorkflowManagerUtil.createEmptyWorkflow();
            var project = Project.builder() //
                .setWfm(wfm) //
                .setOrigin(Origin.of("providerID", "spaceId", "itemId", ProjectTypeEnum.WORKFLOW)) //
                .setId(projectId) //
                .build();
            ProjectManager.getInstance().addProject(project);
            ServiceDependencies.setServiceDependency(WorkflowMiddleware.class,
                new WorkflowMiddleware(ProjectManager.getInstance(), null));
            var nodeFactoryProvider = mock(NodeFactoryProvider.class);
            Class factoryClass = PortObjectInNodeFactory.class;
            when(nodeFactoryProvider.fromFileExtension(endsWith(".txt"))).thenReturn(factoryClass);
            ServiceDependencies.setServiceDependency(NodeFactoryProvider.class, nodeFactoryProvider);
            var success = ImportURI.importURIAtWorkflowCanvas(uri, projectId, "root", 44, 34);
            assertThat(success).isTrue();
            assertThat(wfm.getNodeContainers()).hasSize(1);
        } finally {
            ProjectManager.getInstance().removeProject(projectId);
            ServiceInstances.disposeAllServiceInstancesAndDependencies();
        }
    }

    @AfterEach
    void cleanUp() {
        DesktopAPI.disposeDependencies();
    }

}
