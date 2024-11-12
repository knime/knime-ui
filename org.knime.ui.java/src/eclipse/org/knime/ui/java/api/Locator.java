package org.knime.ui.java.api;

import java.util.List;
import java.util.Objects;

import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.knime.gateway.api.webui.entity.SpaceProviderEnt;
import org.knime.gateway.impl.webui.spaces.Space;
import org.knime.gateway.impl.webui.spaces.SpaceProvider;

public class Locator {
    public static final class Siblings extends SpaceLocator {
        private final List<String> itemIds;

        Siblings(String providerId, String spaceId, List<String> itemIds) {
            super(providerId, spaceId);
            this.itemIds = itemIds;
        }

        public List<String> itemIds() {
            return itemIds;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o)
                return true;
            if (o == null || getClass() != o.getClass())
                return false;
            Siblings that = (Siblings)o;
            return new EqualsBuilder().appendSuper(super.equals(o)).append(itemIds, that.itemIds).isEquals();
        }

        @Override
        public int hashCode() {
            return new HashCodeBuilder(17, 37).appendSuper(super.hashCode()).append(itemIds).toHashCode();
        }
    }

    static class SpaceLocator {
        private final String m_providerId;

        private final String m_spaceId;

        private SpaceLocator(String providerId, String spaceId) {
            this.m_providerId = providerId;
            this.m_spaceId = spaceId;
        }

        SpaceProvider provider() {
            return SpaceAPI.getSpaceProvider(this.providerId());
        }

        public Space space() {
            return this.provider().getSpace(this.spaceId());
        }

        boolean isLocal() {
            return provider().getType() == SpaceProviderEnt.TypeEnum.LOCAL;
        }

        boolean isHub() {
            return provider().getType() == SpaceProviderEnt.TypeEnum.HUB;
        }

        public String providerId() {
            return m_providerId;
        }

        public String spaceId() {
            return m_spaceId;
        }

        @Override
        public boolean equals(Object obj) {
            if (obj == this)
                return true;
            if (obj == null || obj.getClass() != this.getClass())
                return false;
            var that = (SpaceLocator)obj;
            return Objects.equals(this.m_providerId, that.m_providerId)
                && Objects.equals(this.m_spaceId, that.m_spaceId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(m_providerId, m_spaceId);
        }

        @Override
        public String toString() {
            return "SpaceLocator[" + "spaceProviderId=" + m_providerId + ", " + "spaceId=" + m_spaceId + ']';
        }

    }

    public static final class Item extends SpaceLocator {

        private final String itemId;

        /**
         * @param providerId ID of the space provider containing the item
         * @param spaceId ID of the space in provider with ID {@code spaceProviderId} containing the item
         * @param itemId ID of the item contained in space with ID {@code spaceId}
         */
        Item(String providerId, String spaceId, String itemId) {
            super(providerId, spaceId);
            this.itemId = itemId;
        }

        public String itemId() {
            return itemId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o)
                return true;
            if (o == null || getClass() != o.getClass())
                return false;
            Item that = (Item)o;
            return new EqualsBuilder().appendSuper(super.equals(o)).append(itemId, that.itemId).isEquals();
        }

        @Override
        public int hashCode() {
            return new HashCodeBuilder(17, 37).appendSuper(super.hashCode()).append(itemId).toHashCode();
        }
    }
}
