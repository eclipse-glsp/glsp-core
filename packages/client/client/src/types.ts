/********************************************************************************
 * Copyright (c) 2019-2026 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { SPROTTY_TYPES } from '@eclipse-glsp/sprotty';

const IGModelRootListener = Symbol('IGModelRootListener');

/**
 * Ensures at compile time that {@link TYPES} maps every sprotty identifier (except the intentionally omitted `SvgExporter`),
 * so identifiers introduced by a sprotty update cannot be missed silently.
 * The index signature allows the additional GLSP identifiers.
 */
type SprottyTypesMapping = Omit<typeof SPROTTY_TYPES, 'SvgExporter'> & Record<string, symbol>;

/**
 * Service identifiers of the GLSP client.
 *
 * The sprotty identifiers are listed explicitly and map to the same symbols as {@link SPROTTY_TYPES},
 * so sprotty and GLSP code resolve the same bindings. Identifiers that GLSP replaces with its own
 * (e.g. `SvgExporter` by `ISvgExporter`) are omitted and only available via {@link SPROTTY_TYPES}.
 */
export const TYPES = {
    // Sprotty service identifiers
    Action: SPROTTY_TYPES.Action,
    ActionHandlerRegistration: SPROTTY_TYPES.ActionHandlerRegistration,
    /** @deprecated Using async providers for container service retrieval is discouraged. Use the `LazyInjector` instead */
    ActionHandlerRegistryProvider: SPROTTY_TYPES.ActionHandlerRegistryProvider,
    AnimationFrameSyncer: SPROTTY_TYPES.AnimationFrameSyncer,
    CommandRegistration: SPROTTY_TYPES.CommandRegistration,
    CommandStackOptions: SPROTTY_TYPES.CommandStackOptions,
    DOMHelper: SPROTTY_TYPES.DOMHelper,
    HiddenModelViewer: SPROTTY_TYPES.HiddenModelViewer,
    HiddenVNodePostprocessor: SPROTTY_TYPES.HiddenVNodePostprocessor,
    HoverState: SPROTTY_TYPES.HoverState,
    IActionDispatcher: SPROTTY_TYPES.IActionDispatcher,
    IActionDispatcherProvider: SPROTTY_TYPES.IActionDispatcherProvider,
    IActionHandlerInitializer: SPROTTY_TYPES.IActionHandlerInitializer,
    IAnchorComputer: SPROTTY_TYPES.IAnchorComputer,
    IButtonHandlerRegistration: SPROTTY_TYPES.IButtonHandlerRegistration,
    ICommandPaletteActionProvider: SPROTTY_TYPES.ICommandPaletteActionProvider,
    ICommandPaletteActionProviderRegistry: SPROTTY_TYPES.ICommandPaletteActionProviderRegistry,
    ICommandStack: SPROTTY_TYPES.ICommandStack,
    ICommandStackProvider: SPROTTY_TYPES.ICommandStackProvider,
    IContextMenuItemProvider: SPROTTY_TYPES.IContextMenuItemProvider,
    IContextMenuProviderRegistry: SPROTTY_TYPES.IContextMenuProviderRegistry,
    IContextMenuService: SPROTTY_TYPES.IContextMenuService,
    IContextMenuServiceProvider: SPROTTY_TYPES.IContextMenuServiceProvider,
    IDiagramLocker: SPROTTY_TYPES.IDiagramLocker,
    IEdgeRoutePostprocessor: SPROTTY_TYPES.IEdgeRoutePostprocessor,
    IEdgeRouter: SPROTTY_TYPES.IEdgeRouter,
    IEditLabelValidationDecorator: SPROTTY_TYPES.IEditLabelValidationDecorator,
    IEditLabelValidator: SPROTTY_TYPES.IEditLabelValidator,
    ILogger: SPROTTY_TYPES.ILogger,
    IModelFactory: SPROTTY_TYPES.IModelFactory,
    IModelLayoutEngine: SPROTTY_TYPES.IModelLayoutEngine,
    IPopupModelProvider: SPROTTY_TYPES.IPopupModelProvider,
    ISnapper: SPROTTY_TYPES.ISnapper,
    ISvgExportPostprocessor: SPROTTY_TYPES.ISvgExportPostprocessor,
    IUIExtension: SPROTTY_TYPES.IUIExtension,
    IViewer: SPROTTY_TYPES.IViewer,
    IViewerProvider: SPROTTY_TYPES.IViewerProvider,
    IVNodePostprocessor: SPROTTY_TYPES.IVNodePostprocessor,
    KeyListener: SPROTTY_TYPES.KeyListener,
    Layouter: SPROTTY_TYPES.Layouter,
    LayoutRegistration: SPROTTY_TYPES.LayoutRegistration,
    LayoutRegistry: SPROTTY_TYPES.LayoutRegistry,
    LogLevel: SPROTTY_TYPES.LogLevel,
    ModelRendererFactory: SPROTTY_TYPES.ModelRendererFactory,
    ModelSource: SPROTTY_TYPES.ModelSource,
    ModelSourceProvider: SPROTTY_TYPES.ModelSourceProvider,
    ModelViewer: SPROTTY_TYPES.ModelViewer,
    MouseListener: SPROTTY_TYPES.MouseListener,
    PatcherProvider: SPROTTY_TYPES.PatcherProvider,
    PopupModelViewer: SPROTTY_TYPES.PopupModelViewer,
    PopupMouseListener: SPROTTY_TYPES.PopupMouseListener,
    PopupVNodePostprocessor: SPROTTY_TYPES.PopupVNodePostprocessor,
    SModelElementRegistration: SPROTTY_TYPES.SModelElementRegistration,
    SModelRegistry: SPROTTY_TYPES.SModelRegistry,
    // Only used by sprotty's legacy `ExportSvgCommand`. GLSP code uses `ISvgExporter` instead.
    // SvgExporter: SPROTTY_TYPES.SvgExporter,
    UIExtensionRegistry: SPROTTY_TYPES.UIExtensionRegistry,
    ViewerOptions: SPROTTY_TYPES.ViewerOptions,
    ViewRegistration: SPROTTY_TYPES.ViewRegistration,
    ViewRegistry: SPROTTY_TYPES.ViewRegistry,

    // GLSP service identifiers
    // GLSP extends certain sprotty base classes and replaces constructor injection with lazy injection to avoid circular dependencies
    // To pass inversify base class checks an empty array has to be injected.
    // This is the purpose of this service identifier. Typically adopters should not have to  use this identifier.
    EmptyArray: Symbol('EmptyArray'),
    Grid: Symbol('Grid'),
    IAsyncClipboardService: Symbol('IAsyncClipboardService'),
    IAutocompleteSuggestionProvider: Symbol('IAutocompleteSuggestionProvider'),
    IAutocompleteSuggestionProviderRegistry: Symbol('IAutocompleteSuggestionProviderRegistry'),
    IChangeBoundsManager: Symbol('IChangeBoundsManager'),
    IContainerManager: Symbol('IContainerManager'),
    /** @deprecated Use {@link TYPES.IContextMenuItemProvider} for context menu item providers. */
    IContextMenuProvider: Symbol('IContextMenuProvider'),
    ICopyPasteHandler: Symbol('ICopyPasteHandler'),
    IDebugManager: Symbol('IDebugManager'),
    IDefaultTool: Symbol('IDefaultTool'),
    IDiagramExporter: Symbol('IDiagramExporter'),
    IDiagramLoader: Symbol('IDiagramLoader'),
    IDiagramOptions: Symbol('IDiagramOptions'),
    IDiagramStartup: Symbol('IDiagramStartup'),
    IEditModeListener: Symbol('IEditModeListener'),
    IEditorContextService: Symbol('IEditorContextService'),
    /** @deprecated Async provider is no longer necessary. Either directly inject or use `LazyInjector`*/
    IEditorContextServiceProvider: Symbol('IEditorContextProvider'),
    IElementNavigator: Symbol('IElementNavigator'),
    IFeedbackActionDispatcher: Symbol('IFeedbackActionDispatcher'),
    IFocusTracker: Symbol('IFocusTracker'),
    IGModelElementComparator: Symbol('IGModelElementComparator'),
    IGModelRootListener: IGModelRootListener,
    IGridManager: Symbol('IGridManager'),
    IHelperLineManager: Symbol('IHelperLineManager'),
    IHelperLineOptions: Symbol('IHelperLineOptions'),
    ILocalElementNavigator: Symbol('ILocalElementNavigator'),
    IMarkerNavigator: Symbol('IMarkerNavigator'),
    IMarqueeBehavior: Symbol('IMarqueeBehavior'),
    IMarqueeUtil: Symbol('IMarqueeUtil'),
    IModelChangeService: Symbol('IModelChangeService'),
    IModelInitializationConstraint: Symbol('IModelInitializationConstraint'),
    IMovementOptions: Symbol('IMovementOptions'),
    IMovementRestrictor: Symbol('IMovementRestrictor'),
    INavigationTargetResolver: Symbol('INavigationTargetResolver'),
    ISelectionListener: Symbol('ISelectionListener'),
    ISelectionService: Symbol('ISelectionService'),
    /**
     * Experimental shortcut manager.
     * The API is not stable yet.
     */
    IShortcutManager: Symbol('IShortcutManager'),
    /** @deprecated Use {@link TYPES.IGModelRootListener} instead */
    ISModelRootListener: IGModelRootListener,
    ISvgExporter: Symbol('ISvgExporter'),
    ITool: Symbol('ITool'),
    IToolFactory: Symbol('Factory<Tool>'),
    IToolManager: Symbol('IToolManager'),
    ITypeHintProvider: Symbol('ITypeHintProvider'),
    IValidationFeedbackEmitter: Symbol('IValidationFeedbackEmitter'),
    ZoomFactors: Symbol('ZoomFactors')
} satisfies SprottyTypesMapping;
