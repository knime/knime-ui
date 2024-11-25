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
 *   Jan 16, 2023 (hornm): created
 */
package org.knime.ui.java.browser.lifecycle;

import org.eclipse.core.runtime.preferences.ConfigurationScope;
import org.knime.core.node.NodeLogger;
import org.knime.ui.java.persistence.AppStatePersistor;
import org.knime.ui.java.persistence.UserProfilePersistor;
import org.knime.ui.java.profile.UserProfile;
import org.knime.ui.java.util.PerspectiveUtil;
import org.knime.ui.java.util.UserDirectory;
import org.osgi.service.prefs.BackingStoreException;

/**
 * The shutdown lifecycle state transition of the KNIME-UI. The {@link Suspend}-phase must have been run first.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class Shutdown {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(Shutdown.class);

    private Shutdown() {
        //
    }

    /**
     * Runs the phase.
     *
     * @param state
     * @param localStorageAccess
     */
    static void run(final LifeCycleStateInternal state) {
        if (state != null) {
            AppStatePersistor.saveAppState(state.serializedAppState());
            saveUserProfile(state.getUserProfile());
        }
        var prefs = ConfigurationScope.INSTANCE.getNode(SharedConstants.PREFERENCE_NODE_QUALIFIER);
        prefs.putBoolean(SharedConstants.START_WEB_UI_PREF_KEY, !PerspectiveUtil.isClassicPerspectiveActive());
        try {
            prefs.flush();
        } catch (BackingStoreException e) {
            LOGGER.error(e);
        }
    }

    private static void saveUserProfile(final UserProfile userProfile) {
        var userProfilePath = UserDirectory.getProfileDirectory();
        if (userProfilePath.isEmpty()) {
            LOGGER.error("Can't write user profile. No user profile location set.");
            return;
        }
        UserProfilePersistor.saveUserProfile(userProfile, userProfilePath.get());
    }

}
