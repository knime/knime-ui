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
 */
package org.knime.ui.java.util;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.eclipse.core.resources.ResourcesPlugin;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt.TypeEnum;
import org.knime.gateway.api.webui.util.EntityFactory;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;

/**
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 */
public final class LocalSpaceUtil {
    /**
     * Keep a single instance describing the (single) "LOCAL" Space.
     *
     * @see LocalSpaceUtil#getLocalWorkspace()
     */
    private static LocalWorkspace localWorkspace = null;

    /**
     * The ID of the local space provider
     */
    public static final String LOCAL_SPACE_PROVIDER_ID = "local";

    private LocalSpaceUtil() {
        // Utility class
    }

    /**
     * @return The singleton instance of {@link LocalWorkspace}, creating a new instance if not yet present.
     */
    public static LocalWorkspace getLocalWorkspace() {
        if (localWorkspace == null) {
            var localWorkspaceRootPath = ResourcesPlugin.getWorkspace().getRoot().getLocation().toFile().toPath();
            localWorkspace = new LocalWorkspace(localWorkspaceRootPath);
        }
        return localWorkspace;
    }

    /**
     * @return A {@link SpaceProvider} instance providing the {@link LocalWorkspace}
     */
    public static SpaceProvider createLocalWorkspaceProvider() {
        var localSpace = getLocalWorkspace();
        return new SpaceProvider() { // NOSONAR
            @Override
            public String getId() {
                return LOCAL_SPACE_PROVIDER_ID;
            }

            @Override
            public SpaceProviderEnt toEntity() {
                return EntityFactory.Space.buildSpaceProviderEnt(SpaceProviderEnt.TypeEnum.LOCAL,
                    List.of(localSpace.toEntity()));
            }

            @Override
            public Space getSpace(final String spaceId) {
                return Optional.of(localSpace).filter(space -> space.getId().equals(spaceId)).orElseThrow();
            }

            @Override
            public TypeEnum getType() {
                return TypeEnum.LOCAL;
            }

            @Override
            public String getName() {
                return "Local space";
            }
        };
    }

    /**
     * Obtain the {@link org.knime.gateway.impl.project.Project.Origin} of a workflow project on the local file
     * system
     *
     * @param absolutePath The path of the workflow project
     * @return The {@link org.knime.gateway.impl.project.Project.Origin} of the workflow project.
     */
    public static Project.Origin getLocalOrigin(final Path absolutePath) {
        var relativePath = toRelativePath(absolutePath);
        return new Project.Origin() { // NOSONAR
            @Override
            public String getProviderId() {
                return LOCAL_SPACE_PROVIDER_ID;
            }

            @Override
            public String getSpaceId() {
                return LocalWorkspace.LOCAL_WORKSPACE_ID;
            }

            @Override
            public String getItemId() {
                return getLocalWorkspace().getItemId(absolutePath);
            }

            @Override
            public Optional<String> getRelativePath() {
                return Optional.of(relativePath.toString());
            }

            @Override
            public ProjectTypeEnum getProjectType() {
                return getLocalWorkspace().getProjectType(getItemId()).orElseThrow();
            }
        };
    }

    /**
     * @param absolutePath
     * @return a relative path to the root of the local workspace
     */
    private static Path toRelativePath(final Path absolutePath) {
        return localWorkspace.getLocalRootPath().relativize(absolutePath);
    }

    /**
     * @param spaceProviderId
     * @param spaceId
     * @return Returns {@code true} if both parameters indicate we work within the {@link LocalWorkspace}, {@code false}
     *         otherwise.
     */
    public static boolean isLocalSpace(final String spaceProviderId, final String spaceId) {
        return spaceProviderId.equals(LOCAL_SPACE_PROVIDER_ID) && spaceId.equals(LocalWorkspace.LOCAL_WORKSPACE_ID);
    }

    /**
     * @param projectName
     * @return a globally unique project id combined with the given project name
     */
    public static String getUniqueProjectId(final String projectName) {
        return projectName + "_" + UUID.randomUUID();
    }
}
