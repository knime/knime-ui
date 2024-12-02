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

import java.util.Map;
import java.util.function.Supplier;
import java.util.function.UnaryOperator;

import org.knime.core.node.NodeLogger;
import org.knime.ui.java.api.SaveAndCloseProjects;
import org.knime.ui.java.persistence.AppStatePersistor;
import org.knime.ui.java.profile.UserProfile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The 'save-state' lifecycle-state-transition for the KNIME-UI. Called before {@link Suspend}.
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
@SuppressWarnings("restriction")
final class SaveState {

    private static final NodeLogger LOGGER = NodeLogger.getLogger(SaveState.class);

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private SaveState() {
        //
    }

    static LifeCycleStateInternal run(final LifeCycleStateInternal state,
        final UnaryOperator<String> localStorageAccess) throws StateTransitionAbortedException {
        final var serializedAppState = // NOSONAR: Serialize app state before closing all workflows
            AppStatePersistor.serializeAppState(state.getProjectManager(), state.getMostRecentlyUsedProjects());
        // needs to be called before calling the 'save-and-close-projects'-function below because
        // it somehow interferes with the 'save projects' event sent to the browser and causes the AP
        // to freeze on shutdown (not 100% understood, unfortunately) in case of dirty projects
        var updatedUserProfile = updateUserProfileFromLocalStorage(state.getUserProfile(), localStorageAccess);

        final var saveProjectsFunction = state.getSaveAndCloseAllProjectsFunction();
        final var saveProjectsResult = saveProjectsFunction.get();
        if (saveProjectsResult == SaveAndCloseProjects.State.CANCEL_OR_FAIL) {
            throw new StateTransitionAbortedException();
        }

        return new LifeCycleStateInternalAdapter(state) {

            @Override
            public boolean workflowsSaved() {
                return saveProjectsResult == SaveAndCloseProjects.State.SUCCESS;
            }

            @Override
            public Supplier<SaveAndCloseProjects.State> getSaveAndCloseAllProjectsFunction() {
                return saveProjectsFunction;
            }

            @Override
            public String serializedAppState() {
                return serializedAppState;
            }

            @Override
            public UserProfile getUserProfile() {
                return updatedUserProfile;
            }

        };
    }

    private static UserProfile updateUserProfileFromLocalStorage(final UserProfile userProfile,
        final UnaryOperator<String> localStorageAccess) {
        if (localStorageAccess == null) {
            LOGGER.error("Failed to save user profile, no local storage access");
            return userProfile;
        }
        var uiSettingsString = localStorageAccess.apply(UserProfile.UI_SETTINGS_LOCAL_STORAGE_KEY);
        var onboardingHintsSettingsString =
            localStorageAccess.apply(UserProfile.ONBOARDING_HINTS_SETTINGS_LOCAL_STORAGE_KEY);
        try {
            Map<String, String> uiSettings = uiSettingsString != null //
                ? MAPPER.readValue(uiSettingsString, Map.class) //
                : Map.of();
            Map<String, String> onboardingHintsSettings = onboardingHintsSettingsString != null //
                ? MAPPER.readValue(onboardingHintsSettingsString, Map.class) //
                : Map.of();
            return UserProfile.of(userProfile, uiSettings, onboardingHintsSettings);
        } catch (JsonProcessingException e) {
            LOGGER.error("Failed to save user profile", e);
            return userProfile;
        }
    }

}
