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

import java.net.URI;
import java.util.Optional;

import org.knime.workbench.core.imports.EntityImport;
import org.knime.workbench.core.imports.ExtensionImport;
import org.knime.workbench.core.imports.ImportForbiddenException;
import org.knime.workbench.core.imports.NodeImport;
import org.knime.workbench.core.imports.RepoObjectImport;
import org.knime.workbench.core.imports.SecretImport;
import org.knime.workbench.core.imports.URIImporter;
import org.knime.workbench.core.imports.UpdateSiteInfo;

/**
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public class TestURIImporter implements URIImporter {

    @Override
    public boolean canHandle(final URI uri) {
        return uri.toString().startsWith("test://");
    }

    @Override
    public Optional<Class<? extends EntityImport>> getEntityImportClass(final URI uri) {
        if (canHandle(uri)) {
            return Optional.of(NodeImport.class);
        }
        return Optional.empty();
    }

    @Override
    public Optional<NodeImport> createNodeImport(final URI uri) throws ImportForbiddenException {
        if (canHandle(uri)) {
            return Optional.of(new NodeImport() {

                @Override
                public String getFactoryId() {
                    return null;
                }

                @Override
                public UpdateSiteInfo getUpdateSiteInfo() {
                    return null;
                }

                @Override
                public String getFeatureSymbolicName() {
                    return null;
                }

                @Override
                public String getFeatureName() {
                    return null;
                }
            });
        }
        return Optional.empty();
    }

    @Override
    public Optional<ExtensionImport> createExtensionImport(final URI uri) throws ImportForbiddenException {
        throw new UnsupportedOperationException();
    }

    @Override
    public Optional<RepoObjectImport> createRepoObjectImport(final URI uri) throws ImportForbiddenException {
        throw new UnsupportedOperationException();
    }

    @Override
    public Optional<SecretImport> createSecretImport(final URI uri) throws ImportForbiddenException {
        throw new UnsupportedOperationException();
    }

}
