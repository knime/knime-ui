
package org.knime.ui.java;

import javax.inject.Inject;

import org.eclipse.e4.core.di.annotations.Optional;
import org.eclipse.e4.core.di.extensions.EventTopic;
import org.eclipse.e4.ui.model.application.MApplication;
import org.eclipse.e4.ui.model.application.ui.advanced.MPerspective;
import org.eclipse.e4.ui.model.application.ui.basic.MTrimmedWindow;
import org.eclipse.e4.ui.workbench.UIEvents;
import org.eclipse.e4.ui.workbench.UIEvents.EventTags;
import org.eclipse.e4.ui.workbench.modeling.EModelService;
import org.osgi.service.event.Event;

/**
 * Registered as fragemnt with the application model. Listens to perspective
 * switch events in order to remove/add stuff (e.g. toolbars, trims etc.).
 *
 * Done via listener in order to add/remove that stuff no matter how the
 * perspective is changed (e.g. via toolbar action, perspective switch shortcut,
 * etc.).
 *
 * @author Martin Horn, KNIME GmbH, Konstanz, Germany
 */
public final class PerspectiveSwitchAddon {

	@Inject
	private EModelService m_modelService;

	@Inject
	private MApplication m_app;

	@Inject
	@Optional
	public void listen(@EventTopic(UIEvents.ElementContainer.TOPIC_SELECTEDELEMENT) final Event event) {
		Object newValue = event.getProperty(EventTags.NEW_VALUE);
		if (!(newValue instanceof MPerspective)) {
			return;
		}
		MPerspective oldPerspective = (MPerspective) event.getProperty(EventTags.OLD_VALUE);
		MPerspective newPerspective = (MPerspective) newValue;
		MPerspective webUIPerspective = SwitchToWebUIHandler.getWebUIPerspective(m_app, m_modelService);
		if (oldPerspective == webUIPerspective || newPerspective == webUIPerspective) {
			setTrimsAndMenuVisible(newPerspective != webUIPerspective);
		}
	}

	private void setTrimsAndMenuVisible(final boolean visible) {
		m_modelService.find("org.eclipse.ui.trim.status", m_app).setVisible(visible);
		m_modelService.find("org.eclipse.ui.main.toolbar", m_app).setVisible(visible);
		MTrimmedWindow window = (MTrimmedWindow) m_app.getChildren().get(0);
		window.getMainMenu().setToBeRendered(visible);
	}

}
