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
 */
package org.knime.ui.java.util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import org.knime.core.node.KNIMEConstants;
import org.knime.core.node.NodeLogger;
import org.knime.core.util.EclipseUtil;
import org.knime.gateway.impl.webui.modes.WebUIMode;
import org.knime.ui.java.profile.InternalUsageTracking;

import persistence.FileBackedPojo;
import persistence.Persistence;

/**
 * Provide access to the "KNIME User Directory" (for example {@code ~/.knime/}. Note that this is different from the
 * "KNIME Home Directory", see {@link KNIMEConstants#getKNIMEHomeDir()}.
 */
public final class UserDirectory {

    private UserDirectory() {
    }

    private static Optional<Path> getUserDirectory() {
        var configuredPath = System.getProperty("org.knime.ui.userdirectory");
        if (configuredPath != null) {
            return Optional.of(Path.of(configuredPath));
        }
        if (!EclipseUtil.isRunFromSDK()) {
            try {
                return Optional.of(KNIMEConstants.getOrCreateKNIMEDir());
            } catch (IOException e) {
                NodeLogger.getLogger(UserDirectory.class).warn("Could not access user directory", e);
                return Optional.empty();
            }
        } else {
            return Optional.empty();
        }
    }

    private static Optional<Path> getProfileDirectory() {
        return getUserDirectory().map(userDir -> {
            var path = userDir.resolve("profile");
            if (!Files.exists(path)) {
                try {
                    Files.createDirectory(path);
                } catch (IOException e) { // NOSONAR
                    NodeLogger.getLogger(UserDirectory.class).warn("Could not create profile directory", e);
                    return null;
                }
            }
            return path;
        });
    }

    public static Optional<Persistence<InternalUsageTracking>> getInternalUsageTracking() {
        if (WebUIMode.getMode() != WebUIMode.DEFAULT) {
            return Optional.empty();
        }
        return getProfileDirectory() //
            .map(path -> new FileBackedPojo<>( //
                path.resolve("usage.yaml"), //
                InternalUsageTracking.class));
    }

}
