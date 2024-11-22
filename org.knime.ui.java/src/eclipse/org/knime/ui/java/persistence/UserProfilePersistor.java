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
 *   Nov 20, 2024 (hornm): created
 */
package org.knime.ui.java.persistence;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Supplier;

import org.knime.core.node.NodeLogger;
import org.knime.ui.java.profile.InternalUsage;
import org.knime.ui.java.profile.UserProfile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.dataformat.yaml.YAMLGenerator;

/**
 * Utlity class to read and write the user profile to the file system.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class UserProfilePersistor {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(UserProfilePersistor.class);

    private static final ObjectMapper MAPPER =
        new ObjectMapper(YAMLFactory.builder().disable(YAMLGenerator.Feature.WRITE_DOC_START_MARKER).build());

    private static final UserProfileFile<Map> UI_SETTINGS_FILE =
        new UserProfileFile<>("ui-settings.yaml", UserProfile::uiSettings, Map::of, Map.class);

    private static final UserProfileFile<Map> ONBOARDING_HINTS_SETTINGS_FILE = new UserProfileFile<>(
        "onboarding-hints-settings.yaml", UserProfile::onboardingHintsSettings, Map::of, Map.class);

    private static final UserProfileFile<InternalUsage> USAGE_FILE =
        new UserProfileFile<>("usage.yaml", UserProfile::internalUsage, InternalUsage::new, InternalUsage.class);

    private UserProfilePersistor() {
        // utility
    }

    /**
     * Saves the user profile to the file system.
     *
     * @param userProfile
     * @param profilePath
     */
    public static void saveUserProfile(final UserProfile userProfile, final Path profilePath) {
        List.of(UI_SETTINGS_FILE, ONBOARDING_HINTS_SETTINGS_FILE, USAGE_FILE).forEach(f -> {
            try {
                MAPPER.writeValue(profilePath.resolve(f.fileName).toFile(), f.getValue.apply(userProfile));
            } catch (IOException e) {
                LOGGER.error("Failed to write user profile file: " + f.fileName, e);
            }
        });
    }

    /**
     * Reads the user profile from the file system.
     *
     * @param profilePath
     *
     * @return a new instance of {@link UserProfile}
     */
    public static UserProfile loadUserProfile(final Path profilePath) {
        var uiSettings = readUserProfileFile(UI_SETTINGS_FILE, profilePath);
        var onboardingHints = readUserProfileFile(ONBOARDING_HINTS_SETTINGS_FILE, profilePath);
        var usage = readUserProfileFile(USAGE_FILE, profilePath);
        return new UserProfile() {

            @Override
            public Map<String, String> uiSettings() {
                return uiSettings;
            }

            @Override
            public Map<String, String> onboardingHintsSettings() {
                return onboardingHints;
            }

            @Override
            public InternalUsage internalUsage() {
                return usage;
            }
        };
    }

    /**
     * @return an instance representing an empty user profile
     */
    public static UserProfile createEmptyUserProfile() {
       return new UserProfile() {

        @Override
        public Map<String, String> uiSettings() {
            return UI_SETTINGS_FILE.emptyValueSupplier.get();
        }

        @Override
        public Map<String, String> onboardingHintsSettings() {
            return ONBOARDING_HINTS_SETTINGS_FILE.emptyValueSupplier.get();
        }

        @Override
        public InternalUsage internalUsage() {
            return USAGE_FILE.emptyValueSupplier.get();
        }
    };
    }

    private static <T> T readUserProfileFile(final UserProfileFile<T> upFile, final Path profilePath) {
        try {
            var file = profilePath.resolve(upFile.fileName);
            if (Files.exists(file)) {
                return MAPPER.readValue(profilePath.resolve(upFile.fileName).toFile(), upFile.type);
            }
        } catch (IOException e) {
            LOGGER.error("Failed to read user profile file: " + upFile.fileName, e);
        }
        return upFile.emptyValueSupplier.get();
    }

    private record UserProfileFile<T>(String fileName, Function<UserProfile, T> getValue,
        Supplier<T> emptyValueSupplier, Class<T> type) {
        //
    }

}
