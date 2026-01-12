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
 *   Nov 21, 2024 (hornm): created
 */
package org.knime.ui.java.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.knime.core.util.FileUtil;
import org.knime.ui.java.profile.InternalUsageTracking;
import org.knime.ui.java.profile.UserProfile;

/**
 * Tests {@link UserProfilePersistor}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
class UserProfilePersistorTest {

    private Path m_profileDir;


    @BeforeEach
    void setUserDir() throws IOException {
        m_profileDir = FileUtil.createTempDir("user_profile_test").toPath();
    }

    /**
     * Tests that saving and loading a user profile works as expected.
     *
     * @throws Exception
     */
    @Test
    void testSaveLoadUserProfile() throws Exception {
        // read user profile from an empty directory
        var userProfile = UserProfilePersistor.loadUserProfile(m_profileDir);
        assertThat(userProfile.uiSettings()).isEmpty();
        assertThat(userProfile.onboardingHintsSettings()).isEmpty();
        assertThat(userProfile.aiSettings()).isEmpty();
        assertThat(userProfile.internalUsage().getTimesUiCreated()).isZero();

        // save an existing user profile
        UserProfilePersistor.saveUserProfile(createUserProfile(), m_profileDir);
        var uiSettings = Files.readString(m_profileDir.resolve("ui-settings.yaml"));
        assertIsEqualIgnoreLineOrder(uiSettings, """
                setting2: "value2"
                setting1: "value1"
                """);
        var onboadingHintsSettings = Files.readString(m_profileDir.resolve("onboarding-hints-settings.yaml"));
        assertIsEqualIgnoreLineOrder(onboadingHintsSettings, """
                hint1: "value1"
                hint2: "value2"
                """);
        var aiSettingsFile = Files.readString(m_profileDir.resolve("ai-settings.yaml"));
        assertIsEqualIgnoreLineOrder(aiSettingsFile, """
                ai1: "value1"
                ai2: "value2"
                """);
        var usage = Files.readString(m_profileDir.resolve("usage.yaml"));
        assertIsEqualIgnoreLineOrder(usage, """
                timesUiCreated: 2
                """);

        // read an existing user profile
        userProfile = UserProfilePersistor.loadUserProfile(m_profileDir);
        assertThat(userProfile.uiSettings())
            .containsExactlyEntriesOf(Map.of("setting1", "value1", "setting2", "value2"));
        assertThat(userProfile.onboardingHintsSettings())
            .containsExactlyEntriesOf(Map.of("hint1", "value1", "hint2", "value2"));
        assertThat(userProfile.aiSettings())
            .containsExactlyEntriesOf(Map.of("ai1", "value1", "ai2", "value2"));
        assertThat(userProfile.internalUsage().getTimesUiCreated()).isEqualTo(2);
    }

    /**
     * Makes sure that unknown properties are retained when saving and loading a user profile.
     *
     * @throws Exception
     */
    @Test
    void testSaveLoadUserProfileWithUnknownProperties() throws Exception {
        Files.writeString(m_profileDir.resolve("usage.yaml"), """
                timesUiCreated: 2
                unknownProperty: "blub"
                """);
        var userProfile = UserProfilePersistor.loadUserProfile(m_profileDir);
        assertThat(userProfile.internalUsage().getTimesUiCreated()).isEqualTo(2);

        // make sure that the unknown property is retained when saving the profile again
        userProfile.internalUsage().trackUiCreated();
        UserProfilePersistor.saveUserProfile(userProfile, m_profileDir);
        var uiSettings = Files.readString(m_profileDir.resolve("usage.yaml"));
        assertIsEqualIgnoreLineOrder(uiSettings, """
                timesUiCreated: 3
                unknownProperty: "blub"
                """);
    }

    private static void assertIsEqualIgnoreLineOrder(final String actual, final String expected) {
        assertThat(sortLines(actual)).isEqualTo(sortLines(expected));
    }

    private static String sortLines(final String s) {
        return s.lines().sorted().collect(Collectors.joining("\n"));
    }

    private static UserProfile createUserProfile() {
        var usage = new InternalUsageTracking();
        usage.trackUiCreated();
        usage.trackUiCreated();
        return new UserProfile(usage, Map.of("setting1", "value1", "setting2", "value2"),
            Map.of("hint1", "value1", "hint2", "value2"),
            Map.of("ai1", "value1", "ai2", "value2"));
    }

}
