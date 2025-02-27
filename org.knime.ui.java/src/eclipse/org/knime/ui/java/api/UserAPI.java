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
 *   Feb 19, 2025 (hornm): created
 */
package org.knime.ui.java.api;

import java.util.Map;
import java.util.function.Function;

import org.knime.ui.java.profile.UserProfile;

import com.fasterxml.jackson.core.JsonProcessingException;

/**
 * Gives access to user-related things (e.g. the user profile).
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
final class UserAPI {

    private enum UserProfilePart {
            UI_SETTINGS("knime-ui-settings", UserProfile::uiSettings),
            ONBOARDING_HINTS_SETTINGS("onboarding.hints.user", UserProfile::onboardingHintsSettings);

        private final String m_key;

        private final Function<UserProfile, Map<String, String>> m_access;

        UserProfilePart(final String key, final Function<UserProfile, Map<String, String>> access) {
            m_key = key;
            m_access = access;
        }

        private static UserProfilePart of(final String key) {
            if (UI_SETTINGS.m_key.equals(key)) {
                return UI_SETTINGS;
            } else if (ONBOARDING_HINTS_SETTINGS.m_key.equals(key)) {
                return ONBOARDING_HINTS_SETTINGS;
            } else {
                throw new IllegalArgumentException("Unknown key: " + key);
            }
        }

        Map<String, String> get(final UserProfile userProfile) {
            return m_access.apply(userProfile);
        }

    }

    private UserAPI() {
        //
    }

    /**
     * Updates a part (identified by a key) of the user profile.
     *
     * @param key the part of the user profile to update
     * @param value the new value to replace the old value with completely
     * @throws JsonProcessingException
     */
    @API
    static void setUserProfilePart(final String key, final String data)
        throws JsonProcessingException {
        var userProfile = DesktopAPI.getDeps(UserProfile.class);
        var mapToUpdate = UserProfilePart.of(key).get(userProfile);
        var dataMap = DesktopAPI.MAPPER.readValue(data, Map.class);
        mapToUpdate.clear();
        mapToUpdate.putAll(dataMap);
    }

    /**
     * @return parts of the user profile (identified by a key)
     */
    @API
    static Map<String, String> getUserProfilePart(final String key) {
        var userProfile = DesktopAPI.getDeps(UserProfile.class);
        return UserProfilePart.of(key).get(userProfile);
    }

}
