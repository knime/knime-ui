/*
 * ------------------------------------------------------------------------
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
 * -------------------------------------------------------------------
 */
package org.knime.ui.java.profile;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Aggregates several aspects of user-specific state. Each aspect is handled (read, persisted, ...) independently.
 *
 * @param internalUsage the {@link InternalUsageTracking} instance
 * @param uiSettings a map representing the ui-settings; can be modified to update the ui settings
 * @param onboardingHintsSettings a map representing the onboarding hints settings; can be modified to update the
 *            onboarding hints settings
 * @param aiSettings a map representing the AI-related settings; can be modified to update the AI settings
 */
public record UserProfile(InternalUsageTracking internalUsage, Map<String, String> uiSettings,
    Map<String, String> onboardingHintsSettings, Map<String, String> aiSettings) {

    @SuppressWarnings("javadoc")
    public UserProfile(final InternalUsageTracking internalUsage, final Map<String, String> uiSettings,
        final Map<String, String> onboardingHintsSettings, final Map<String, String> aiSettings) {
        this.internalUsage = internalUsage;
        this.uiSettings = new LinkedHashMap<>(uiSettings);
        this.onboardingHintsSettings = new LinkedHashMap<>(onboardingHintsSettings);
        this.aiSettings = new LinkedHashMap<>(aiSettings);
    }

    /**
     * Helper to create a copy of the given {@link UserProfile} with the given {@link InternalUsageTracking} being
     * 'copied' over.
     *
     * @param userProfile the user-profile to get the internal-usage-tracking from
     * @param uiSettings
     * @param onboardingHintsSettings
     * @param aiSettings
     * @return a new {@link UserProfile}-instance
     */
    public static UserProfile of(final UserProfile userProfile, final Map<String, String> uiSettings,
        final Map<String, String> onboardingHintsSettings, final Map<String, String> aiSettings) {
        return new UserProfile(userProfile.internalUsage(), uiSettings, onboardingHintsSettings, aiSettings);
    }

}
