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
 *   Mar 3, 2023 (hornm): created
 */
package org.knime.ui.java.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.knime.core.node.KNIMEConstants;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.Project.Origin;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.testing.util.WorkflowManagerUtil;

/**
 * Tests methods in {@link AppStatePersistor}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class AppStatePersistorTest {

    @Test
    void testSaveAndLoadAppState() throws IOException {
        openWorkflowProject();
        var appStateString = AppStatePersistor.serializeAppState();
        AppStatePersistor.saveAppState(appStateString);
        assertAppStateFile();

        var wpm = ProjectManager.getInstance();
        wpm.getProjectIds().forEach(id -> wpm.removeProject(id, WorkflowManagerUtil::disposeWorkflow));

        AppStatePersistor.loadAppState();
        var appStateStringNew = AppStatePersistor.serializeAppState();
        assertThat(appStateStringNew).isEqualTo(appStateString);
    }

    @AfterEach
    void cleanUp() {
        var wpm = ProjectManager.getInstance();
        wpm.getProjectIds().forEach(id -> wpm.removeProject(id, WorkflowManagerUtil::disposeWorkflow));
    }

    @SuppressWarnings("javadoc")
    public static void openWorkflowProject() {
        var wpm = ProjectManager.getInstance();
        var project = mock(Project.class);
        when(project.getID()).thenReturn("test_id");
        when(project.getName()).thenReturn("Test Project");
        var origin = mock(Origin.class);
        when(origin.getSpaceId()).thenReturn("test_space_id");
        when(origin.getProviderId()).thenReturn(SpaceProvider.LOCAL_SPACE_PROVIDER_ID);
        when(origin.getRelativePath()).thenReturn(Optional.of("a/relative/path"));
        when(project.getOrigin()).thenReturn(Optional.of(origin));
        wpm.addProject(project);
    }

    @SuppressWarnings("javadoc")
    public static void assertAppStateFile() throws IOException {
        var appStateJson = new String(Files.readAllBytes(Paths.get(KNIMEConstants.getKNIMEHomeDir(), "app_state.json")),
            StandardCharsets.UTF_8);
        assertThat(appStateJson).isEqualTo("""
                {
                  "version" : "%s",
                  "projects" : [ {
                    "name" : "Test Project",
                    "active" : false,
                    "origin" : {
                      "providerId" : "local",
                      "spaceId" : "test_space_id",
                      "relativePath" : "a/relative/path"
                    }
                  } ]
                }""", KNIMEConstants.VERSION);
    }

}
