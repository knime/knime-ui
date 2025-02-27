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
 *   Feb 27, 2025 (hornm): created
 */
package org.knime.ui.java.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.knime.ui.java.profile.InternalUsageTracking;
import org.knime.ui.java.profile.UserProfile;

import com.fasterxml.jackson.core.JsonProcessingException;

/**
 * Test for {@link UserAPI}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
class UserAPITest {

    /**
     * Tests {@link UserAPI#setUserProfilePart(String, String)} and UserAPI#getUserProfilePart(String)}.
     *
     * @throws JsonProcessingException
     */
    @Test
    void testSetAndGetUserProfilePart() throws JsonProcessingException {
        var userProfile = new UserProfile(new InternalUsageTracking(), Map.of(), Map.of());
        DesktopAPI.injectDependency(userProfile);
        UserAPI.setUserProfilePart("knime-ui-settings", """
                {
                "key1": "value1",
                "key2": "value2"
                }
                """);

        UserAPI.setUserProfilePart("onboarding.hints.user", """
                {
                "key3": "value3",
                "key4": "value4"
                }
                """);

        assertThat(userProfile.uiSettings()).isEqualTo(Map.of("key1", "value1", "key2", "value2"));
        assertThat(userProfile.onboardingHintsSettings()).isEqualTo(Map.of("key3", "value3", "key4", "value4"));

        var uiSettings = UserAPI.getUserProfilePart("knime-ui-settings");
        assertThat(uiSettings).isEqualTo(Map.of("key1", "value1", "key2", "value2"));
        var onboardingHintsSettings = UserAPI.getUserProfilePart("onboarding.hints.user");
        assertThat(onboardingHintsSettings).isEqualTo(Map.of("key3", "value3", "key4", "value4"));

        assertThrows(IllegalArgumentException.class, () -> UserAPI.getUserProfilePart("unknown-key"));

        DesktopAPI.disposeDependencies();
    }

}
