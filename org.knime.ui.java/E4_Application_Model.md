# Notes on the Eclipse E4 Application Model

This plugin contributes to the eclipse platform using the old-new [e4 application model](https://wiki.eclipse.org/Eclipse4/RCP) (first versions released in ~2010).
It is a new way of how to contribute parts to the eclipse UI (such as views, toolbar items, perspectives, handlers, commands and much more).
Those parts used to be contributed by using the respective extension point and implementations of interfaces in Eclipse 3.*. E4, however, does things a bit differently and tries to separate the actual implementation and declaration of the contributed parts more.

Since the (freely available) documentation on e4 seems to be quite sparse the main e4-features and concepts used in this plugin are summarized here (roughly and briefly):

### Application model

The e4 application is backed by a so called application model which is a tree that holds all information relevant to the application (similar to a browser's DOM, but the e4 model also holds non-visual elements).
A central element of the model is, e.g., the MPart-class representing a visual part of the UI.

The model of a pure e4-application is defined in a `Application.e4xmi`-file (there is a wizard to create it). 
However, there is a compatibility layer which integrates 3.x components (views, toolbar items, menu items and much more) into the e4 application model. In that case the application is defined in a file called `LegacyIDE.e4xmi`, the root element (application) has the id `org.eclipse.e4.ide.application`.

### Extending the application model from other plugins

There are two ways in order to contribute to the application model from other plugins (which can be combined, of course):

####  Model fragments

Model fragments are defined in a file, e.g. `fragment.e4xmi`, registered at the `òrg.eclipse.e4.workbench.model` extension point (there is a wizard to create it). Every model fragment definition contributes to the application model by defining the element id of the element to contribute to (e.g. a menu item to an already existing menu) and the actual declarative definition.

In this plugin the following type of model fragments have been used:
* _Trim Contribution - Toolbar - Tool Item:_
To add a button the top-trim of the UI.
* _Command and Handler:_
The handler implements a certain action (e.g. when clicking a toolbar button) and the command ties it to the respective item (e.g. in a toolbar).
* _Perspective:_
The Web-UI perspective is added to the central perspective stack `org.eclipse.ui.ide.perspectivestack` which itself is part of the overall window (id `IDEWindow`).
* _Snippets:_ Allows one to declarative define an element which is later instantiated in the code and, e.g., added to the application model programmatically. Otherwise the snippet definition won't have an effect. The toolbar item in this plugin, e.g., is defined as a snippet and later programmatically added to the application model (in order to be able to place the button on the right of the top trim bar).
* _Add-ons:_
Global objects registered, e.g., in order to listen to events. Here add-ons are used to listen to perspective switch events and when the application start-up is completed (in order to programmatically manipulate the application model then).

In order to add views to the application model they can be registered via the old `org.eclipse.ui.views` endpoint (but adding to `e4views`).

#### Processors

The application model can also be modified programmatically by providing processors to be registered via the `òrg.eclipse.e4.workbench.model` extension point. Not used here.


### Implementation

The implementation of the elements contributed to the application model (e.g. via model fragments) works a bit different than in Eclipse 3.*. Instead of implementing a certain interface, the e4-implementations don't need to extend any interface but provide specifically annotated methods.
Examples:
* a view needs to annotate a method with `@PostContruct` and `@Focus`, optionally `@PreDestroy` to dispose it
* to listen for events the `@Inject` together with the `@EventTopic` annotation for the method-parameter is used
* a handler has a method annotated with `@Execute`

The implementations usually make use of certain [services](https://www.vogella.com/tutorials/Eclipse4Services/article.html) (such as the _model service_ to query for elements in the application model) which a requested/provided via **dependency injection (di)** (`@Inject` is added to fields or parameters).

### Debugging: Spies

There are a couple of so called 'spies' which allow one, e.g., to better debug and understand certain parts of the application model. Useful spies are e.g. the model spy (to get a view on the application model tree at random with the ability to change it live) or the event spy (to capture the events floating around).

The spies can be installed from http://download.eclipse.org/e4/snapshots/org.eclipse.e4.tools/latest/. Need to be added to the _target platform_ to make it available in KNIME. I also needed add _Eclipse Tools Developer Resources_  from http://download.eclipse.org/eclipse/updates/4.15 to make it work in KNIME.

### Misc

There are also _tags_ that can be added to each element, e.g. defined and contributed as model fragment. They seem to have various functions, one being to specify how elements are rendered (e.g. the `FORCE_TEXT`-tag renders the label next to the icon of a toolbar item).