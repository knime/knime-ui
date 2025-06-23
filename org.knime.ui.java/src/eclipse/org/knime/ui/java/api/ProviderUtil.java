package org.knime.ui.java.api;

import java.util.NoSuchElementException;

import org.knime.gateway.impl.webui.spaces.SpaceProvidersManager;

/**
 * -
 */
public final class ProviderUtil {

    private ProviderUtil() {
    }

    /**
     * -
     * 
     * @param providerId -
     * @param spaceId -
     * @return -
     */
    public static boolean isUnknownProject(final String providerId, final String spaceId) {
        try {
            DesktopAPI.getSpace(providerId, spaceId);
            return false;
        } catch (NoSuchElementException e) {
            return true;
        }
    }

    /**
     * TODO de-duplicate with SpaceAPI#connectSpaceProvider
     * 
     * @param spaceProviderId -
     * @return -
     * @throws NoSuchElementException -
     */
    public static boolean connectProvider(final String spaceProviderId) throws NoSuchElementException {
        return DesktopAPI.getDeps(SpaceProvidersManager.class) //
            .getSpaceProviders(SpaceProvidersManager.Key.defaultKey()) //
            .getSpaceProvider(spaceProviderId) //
            .getConnection(true) //
            .isPresent();
    }
}
