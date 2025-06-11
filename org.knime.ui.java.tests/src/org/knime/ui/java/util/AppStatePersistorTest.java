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
import static org.knime.ui.java.util.MostRecentlyUsedProjectsTest.createOrigin;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.knime.core.node.KNIMEConstants;
import org.knime.core.util.PathUtils;
import org.knime.gateway.impl.project.Origin;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.project.ProjectManager;
import org.knime.gateway.impl.project.WorkflowManagerLoader;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager;
import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager.Key;
import org.knime.gateway.impl.webui.spaces.local.LocalSpace;
import org.knime.gateway.impl.webui.spaces.local.LocalSpaceProvider;
import org.knime.ui.java.persistence.AppStatePersistor;
import org.knime.ui.java.util.MostRecentlyUsedProjects.RecentlyUsedProject;

/**
 * Tests methods in {@link AppStatePersistor}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
@SuppressWarnings("java:S5960")
public class AppStatePersistorTest {

    private static final String VALID_APP_STATE_WITH_PROJECT = """
            {
              "version" : "%s",
              "projects" : [ {
                "name" : "relPath",
                "active" : false,
                "origin" : {
                  "providerId" : "%s",
                  "spaceId" : "%s",
                  "relativePath" : "relPath"
                }
              } ]
            }""".formatted( //
        KNIMEConstants.VERSION, //
        SpaceProvider.LOCAL_SPACE_PROVIDER_ID, //
        LocalSpace.LOCAL_SPACE_ID //
    );

    private static final String VALID_APP_STATE_WITH_RECENTLY_USED_PROJECTS = """
            {
              "version" : "%s",
              "projects" : [ ],
              "mostRecentlyUsedProjects" : [ {
                "name" : "name1",
                "timeUsed" : "%s",
                "origin" : {
                  "providerId" : "%s",
                  "spaceId" : "%s",
                  "projectType" : "WORKFLOW",
                  "relativePath" : "relPath"
                }
              }, {
                "name" : "name2",
                "timeUsed" : "%s",
                "origin" : {
                  "providerId" : "pid",
                  "spaceId" : "sid",
                  "projectType" : "WORKFLOW",
                  "itemId" : "iid2"
                }
              } ]
            }""".formatted(KNIMEConstants.VERSION, OffsetDateTime.MAX,
            SpaceProvider.LOCAL_SPACE_PROVIDER_ID, //
            LocalSpace.LOCAL_SPACE_ID, //
            OffsetDateTime.MAX);

    private static final String VALID_APP_STATE_WITHOUT_PROJECT = """
            {
              "version" : "%s",
              "projects" : [ ]
            }""".formatted(KNIMEConstants.VERSION);

    private static final String INVALID_APP_STATE_NO_RELATIVE_PATH = """
            {
              "version" : "%s",
              "projects" : [ {
                "name" : "Test Project",
                "active" : false,
                "origin" : {
                  "providerId" : "%s",
                  "spaceId" : "%s"
                }
              } ]
            }""".formatted(KNIMEConstants.VERSION, //
        SpaceProvider.LOCAL_SPACE_PROVIDER_ID, //
        LocalSpace.LOCAL_SPACE_ID);

    private static final String INVALID_APP_STATE_NO_ORIGIN = """
            {
              "version" : "%s",
              "projects" : [ {
                "name" : "Test Project",
                "active" : false
              } ]
            }""".formatted(KNIMEConstants.VERSION);

    private LocalSpace m_space;

    /**
     * The ID of the single item in {@link this#m_space}
     */
    private static String itemId;

    @Test
    void testSaveAndLoadAppState() throws IOException {
        openWorkflowProject(true);
        var pm = ProjectManager.getInstance();
        var mruProjects = new MostRecentlyUsedProjects();
        var appStateString = AppStatePersistor.serializeAppState(pm, mruProjects, m_space);
        AppStatePersistor.saveAppState(appStateString);
        assertAppStateFile(VALID_APP_STATE_WITH_PROJECT);

        pm.getProjectIds().forEach(pm::removeProject);

        var spaceProvider = new LocalSpaceProvider(m_space);
        var spaceProvidersManager = new SpaceProvidersManager(null, null, null, spaceProvider, List.of());
        spaceProvidersManager.update();
        AppStatePersistor.loadAppState(m_space).openProjectsToRestore()
            .forEach(p -> pm.addProject(
                CreateProject.createProjectFromOrigin(p.origin(), new ProgressReporter.NullProgressReporter(),
                    spaceProvidersManager.getSpaceProviders(Key.defaultKey()))));
        var appStateStringNew = AppStatePersistor.serializeAppState(pm, mruProjects, m_space);
        assertThat(appStateStringNew).as("Assert the valid app state was saved and loaded").isEqualTo(appStateString);
    }

    @Test
    void testInvalidAppStateNoRelativePath() throws IOException {
        AppStatePersistor.saveAppState(INVALID_APP_STATE_NO_RELATIVE_PATH);
        assertAppStateFile(INVALID_APP_STATE_NO_RELATIVE_PATH);

        var pm = ProjectManager.getInstance();
        var mruProjcts = new MostRecentlyUsedProjects();
        AppStatePersistor.loadAppState(m_space);
        var appStateString = AppStatePersistor.serializeAppState(pm, mruProjcts, m_space);
        assertThat(appStateString).as("Assert the invalid app state wasn't loaded")
            .isEqualTo(VALID_APP_STATE_WITHOUT_PROJECT);
    }

    @Test
    void testInvalidAppStateNoOrigin() throws IOException {
        AppStatePersistor.saveAppState(INVALID_APP_STATE_NO_ORIGIN);
        assertAppStateFile(INVALID_APP_STATE_NO_ORIGIN);

        var pm = ProjectManager.getInstance();
        var mruProjects = new MostRecentlyUsedProjects();
        AppStatePersistor.loadAppState(m_space);
        var appStateString = AppStatePersistor.serializeAppState(pm, mruProjects, m_space);
        assertThat(appStateString).as("Assert the invalid app state wasn't loaded")
            .isEqualTo(VALID_APP_STATE_WITHOUT_PROJECT);
    }

    @Test
    void testSaveAndLoadAppStateWithMostRecentlyUsedProjects() throws IOException {
        var pm = ProjectManager.getInstance();
        var mruProjects = new MostRecentlyUsedProjects();
        var proj1 = new RecentlyUsedProject("name1", createOrigin(SpaceProvider.LOCAL_SPACE_PROVIDER_ID,
                LocalSpace.LOCAL_SPACE_ID,
                itemId), OffsetDateTime.MAX);
        var proj2 = new RecentlyUsedProject("name2", createOrigin("pid", "sid", "iid2"), OffsetDateTime.MAX);
        mruProjects.add(proj1);
        mruProjects.add(proj2);
        var appStateString = AppStatePersistor.serializeAppState(pm, mruProjects, m_space);
        AppStatePersistor.saveAppState(appStateString);
        assertAppStateFile(VALID_APP_STATE_WITH_RECENTLY_USED_PROJECTS);

        var loadedMRUProjects = new MostRecentlyUsedProjects();
        var localSpace = m_space;
        AppStatePersistor.loadAppState(localSpace).recentlyUsedProjects().forEach(loadedMRUProjects::add);
        assertThat(loadedMRUProjects.get()).hasSize(2);
        var loadedProj1 = loadedMRUProjects.get().get(0);
        assertThat(loadedProj1.name()).isEqualTo("name1");
        assertThat(loadedProj1.origin().itemId())
            .isEqualTo(localSpace.getItemId(localSpace.getRootPath().resolve(Path.of("relPath"))));
        var loadedProj2 = loadedMRUProjects.get().get(1);
        assertThat(loadedProj2.name()).isEqualTo("name2");
        assertThat(loadedProj2.origin().itemId()).isEqualTo("iid2");

    }

    @BeforeEach
    void setUp() throws IOException {
        var localSpacePath = PathUtils.createTempDir("workspace");
        var localSpace = new LocalSpace(localSpacePath);
        itemId = localSpace.createWorkflow(Space.ROOT_ITEM_ID, "relPath").getId();
        m_space = localSpace;
    }

    @AfterEach
    void cleanUp() {
        var pm = ProjectManager.getInstance();
        pm.getProjectIds().forEach(pm::removeProject);
    }

    @SuppressWarnings("javadoc")
    public static void openWorkflowProject(final boolean isLocal) {
        var pm = ProjectManager.getInstance();


        var providerId = isLocal ? SpaceProvider.LOCAL_SPACE_PROVIDER_ID : "other provider id";
        var spaceId = isLocal ? LocalSpace.LOCAL_SPACE_ID : "other space id";
        var origin = new Origin(providerId, spaceId, itemId);

        var project = Project.builder().setWfmLoader(WorkflowManagerLoader.providingOnlyCurrentState(() -> null)).setName("relPath").setId("test_id")
            .setOrigin(origin).build();
        pm.addProject(project);
    }

    @SuppressWarnings("javadoc")
    public static void assertAppStateFile() throws IOException {
        assertAppStateFile(VALID_APP_STATE_WITH_PROJECT);
    }

    private static void assertAppStateFile(final String appStateString) throws IOException {
        var appStateJson = new String(Files.readAllBytes(Paths.get(KNIMEConstants.getKNIMEHomeDir(), "app_state.json")),
            StandardCharsets.UTF_8);
        assertThat(appStateJson).as("Assert app state file as expected").isEqualTo(appStateString);
    }

    public static void assertAppStateFileExists() {
        assertThat(Files.exists(Paths.get(KNIMEConstants.getKNIMEHomeDir(), "app_state.json"))).isTrue();
    }

}
