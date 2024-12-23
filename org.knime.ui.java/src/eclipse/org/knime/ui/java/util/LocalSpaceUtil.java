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

import java.net.URI;
import java.nio.file.Path;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;

import org.knime.gateway.api.webui.entity.SpaceGroupEnt;
import org.knime.gateway.api.webui.entity.SpaceItemReferenceEnt.ProjectTypeEnum;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt.TypeEnum;
import org.knime.gateway.api.webui.util.EntityFactory;
import org.knime.gateway.impl.project.Project;
import org.knime.gateway.impl.webui.spaces.SpaceGroup;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;
import org.knime.gateway.impl.webui.spaces.local.LocalWorkspace;

/**
 * @author Benjamin Moser, KNIME GmbH, Konstanz, Germany
 */
public final class LocalSpaceUtil {

    private LocalSpaceUtil() {
        // Utility class
    }

    /**
     * @param localSpace the local workspace instance
     * @return A {@link SpaceProvider} instance providing the {@link LocalWorkspace}
     */
    public static SpaceProvider createLocalWorkspaceProvider(final LocalWorkspace localSpace) {
        return new SpaceProvider() { // NOSONAR
            @Override
            public void init(final Consumer<String> loginErrorHandler) {
                // do nothing
            }

            @Override
            public String getId() {
                return LOCAL_SPACE_PROVIDER_ID;
            }

            @Override
            public SpaceProviderEnt toEntity() {
                return EntityFactory.Space.buildSpaceProviderEnt(SpaceProviderEnt.TypeEnum.LOCAL,
                    List.of(getLocalSpaceGroup(localSpace).toEntity()));
            }

            @Override
            public LocalWorkspace getSpace(final String spaceId) {
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

            @Override
            public Optional<SpaceAndItemId> resolveSpaceAndItemId(final URI uri) {
                return getSpace(LocalWorkspace.LOCAL_SPACE_ID).getItemIdByURI(uri) //
                    .map(itemId -> new SpaceAndItemId(LocalWorkspace.LOCAL_SPACE_ID, itemId));
            }

            @Override
            public SpaceGroup<LocalWorkspace> getSpaceGroup(final String spaceGroupName) {
                var localGroup = getLocalSpaceGroup(localSpace);
                if(!spaceGroupName.equals(localGroup.getName())) {
                    throw new NoSuchElementException("No group found with name " + spaceGroupName);
                }
                return localGroup;
            }
        };
    }

    /**
     * Obtain the {@link org.knime.gateway.impl.project.Project.Origin} of a workflow project on the local file system
     *
     * @param absolutePath The path of the workflow project
     * @param localSpace the local workspace instance
     * @return The {@link org.knime.gateway.impl.project.Project.Origin} of the workflow project.
     */
    public static Project.Origin getLocalOrigin(final Path absolutePath, final LocalWorkspace localSpace) {
        var relativePath = toRelativePath(absolutePath, localSpace);
        var itemId = localSpace.getItemId(absolutePath);
        return new Project.Origin() { // NOSONAR
            @Override
            public String getProviderId() {
                return SpaceProvider.LOCAL_SPACE_PROVIDER_ID;
            }

            @Override
            public String getSpaceId() {
                return LocalWorkspace.LOCAL_SPACE_ID;
            }

            @Override
            public String getItemId() {
                return itemId;
            }

            @Override
            public Optional<ProjectTypeEnum> getProjectType() {
                return localSpace.getProjectType(getItemId());
            }
        };
    }

    private static Path toRelativePath(final Path absolutePath, final LocalWorkspace localSpace) {
        return localSpace.getLocalRootPath().relativize(absolutePath);
    }

    /**
     * @param spaceProviderId
     * @param spaceId
     * @return Returns {@code true} if both parameters indicate we work within the {@link LocalWorkspace}, {@code false}
     *         otherwise.
     */
    public static boolean isLocalSpace(final String spaceProviderId, final String spaceId) {
        return spaceProviderId.equals(SpaceProvider.LOCAL_SPACE_PROVIDER_ID)
            && spaceId.equals(LocalWorkspace.LOCAL_SPACE_ID);
    }

    /**
     * @param projectName
     * @return a globally unique project id combined with the given project name
     */
    public static String getUniqueProjectId(final String projectName) {
        return projectName + "_" + UUID.randomUUID();
    }

    /**
     * Creates a Space Group for the local environment
     *
     * @param localSpace
     * @return a SpaceGroup that represents the local group
     */
    public static SpaceGroup<LocalWorkspace> getLocalSpaceGroup(final LocalWorkspace localSpace) {
        return new SpaceGroup<>() {  // NOSONAR

            static final String ID = "Local-space-id";

            static final String NAME = "local";

            @Override
            public SpaceGroupEnt toEntity() {
                return EntityFactory.Space.buildSpaceGroupEnt(ID, NAME, SpaceGroupEnt.TypeEnum.USER,
                    List.of(localSpace.toEntity()));
            }

            @Override
            public String getName() {
                return NAME;
            }

            @Override
            public SpaceGroupType getType() {
                return SpaceGroupType.USER;
            }

            @Override
            public List<LocalWorkspace> getSpaces() {
                return List.of(localSpace);
            }

        };
    }
}
