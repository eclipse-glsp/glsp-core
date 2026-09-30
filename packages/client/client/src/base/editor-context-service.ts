/********************************************************************************
 * Copyright (c) 2020-2026 EclipseSource and others.
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
import {
    Action,
    Args,
    Bounds,
    Disposable,
    DisposableCollection,
    EditMode,
    EditorContext,
    EditorContextResult,
    Emitter,
    Event,
    GModelElement,
    GModelRoot,
    GetEditorContextAction,
    IActionDispatcher,
    IActionHandler,
    LazyInjector,
    MaybePromise,
    MousePositionTracker,
    Point,
    SetDirtyStateAction,
    SetEditModeAction,
    ValueChange,
    Viewport,
    findParentByFeature,
    isViewport
} from '@eclipse-glsp/sprotty';
import { inject, injectable, postConstruct, preDestroy } from 'inversify';
import { TYPES } from '../types';
import { FocusChange, IFocusTracker } from './focus/focus-tracker';
import { IDiagramOptions, IDiagramStartup } from './model/diagram-loader';
import { IModelChangeService, ViewportChange } from './model/model-change-service';
import { ISelectionService, SelectionChange } from './selection-service';

/**
 * A hook to listen for model root changes. Will be called after a server update
 * has been processed
 */
export interface IGModelRootListener {
    modelRootChanged(root: Readonly<GModelRoot>): void;
}

/**
 * @deprecated Use {@link IGModelRootListener} instead
 */
export type ISModelRootListener = IGModelRootListener;

/**
 * A hook to listen for edit mode changes. Will be after the {@link EditorContextService}
 * has handled the {@link SetEditModeAction}.
 */
export interface IEditModeListener {
    editModeChanged(newValue: string, oldValue: string): void;
}

export type DirtyStateChange = Pick<SetDirtyStateAction, 'isDirty' | 'reason'>;

/**
 * Gives read-only access to certain aspects of the diagram, such as the currently selected elements,
 * the model root and the edit mode, and creates the {@link EditorContext} that is sent to the server as part of several actions.
 * Consumers should inject it via {@link TYPES.IEditorContextService}. The default implementation is {@link EditorContextService}.
 */
export interface IEditorContextService extends IActionHandler, Disposable, IDiagramStartup {
    /** Event that is fired when the edit mode of the diagram changes i.e. after a {@link SetEditModeAction} has been handled. */
    readonly onEditModeChanged: Event<ValueChange<string>>;
    /** Event that is fired when the dirty state of the diagram changes i.e. after a {@link SetDirtyStateAction} has been handled. */
    readonly onDirtyStateChanged: Event<DirtyStateChange>;
    /** Event that is fired when the model root of the diagram changes i.e. after the `CommandStack` has processed a model update. */
    readonly onModelRootChanged: Event<Readonly<GModelRoot>>;
    /** Event that is fired when the focus state of the diagram changes. */
    readonly onFocusChanged: Event<FocusChange>;
    /** Event that is fired when the selection of the diagram changes. */
    readonly onSelectionChanged: Event<SelectionChange>;
    /** Event that is fired when the viewport of the diagram changes. */
    readonly onViewportChanged: Event<ViewportChange>;

    /** The source URI of the diagram, if any. */
    readonly sourceUri: string | undefined;
    /** The current edit mode of the diagram. */
    readonly editMode: string;
    /** The diagram type of the diagram. */
    readonly diagramType: string;
    /** The client id of the diagram. */
    readonly clientId: string;
    /** The current model root. Throws an error if the model root is not available yet. */
    readonly modelRoot: Readonly<GModelRoot>;
    /** The viewport element of the current model root, if any. */
    readonly viewport: Readonly<GModelRoot & Viewport> | undefined;
    /** The scroll and zoom data of the current viewport. */
    readonly viewportData: Readonly<Viewport>;
    /** The canvas bounds of the current model root. */
    readonly canvasBounds: Readonly<Bounds>;
    /** The currently selected elements. */
    readonly selectedElements: Readonly<GModelElement>[];
    /** Whether the diagram is in readonly mode. */
    readonly isReadonly: boolean;
    /** Whether the diagram has unsaved changes. */
    readonly isDirty: boolean;

    /**
     * Creates an {@link EditorContext} for the current selection.
     * @param args Optional arguments to include in the context.
     */
    get(args?: Args): EditorContext;

    /**
     * Creates an {@link EditorContext} with the given selection instead of the current selection.
     * @param selectedElementIds The element ids to use as selection.
     * @param args Optional arguments to include in the context.
     */
    getWithSelection(selectedElementIds: string[], args?: Args): EditorContext;
}

/**
 * The `EditorContextService` is a central injectable component that gives read-only access to
 * certain aspects of the diagram, such as the currently selected elements, the model root,
 * the edit mode, the latest position of the mouse in the diagram.
 *
 * It has been introduced for two main reasons:
 * 1. to simplify accessing the model root and the current selection from components that are
 *    not commands,
 * 2. to conveniently create an EditorContext, which is a context object sent as part of several
 *    actions to the server to describe the current state of the editor (selection, last mouse
 *    position, etc.).
 */
@injectable()
export class EditorContextService implements IEditorContextService {
    @inject(TYPES.ISelectionService)
    protected selectionService: ISelectionService;

    @inject(TYPES.IModelChangeService)
    protected modelChangeService: IModelChangeService;

    @inject(MousePositionTracker)
    protected mousePositionTracker: MousePositionTracker;

    @inject(LazyInjector)
    protected lazyInjector: LazyInjector;

    @inject(TYPES.IDiagramOptions)
    protected diagramOptions: IDiagramOptions;

    @inject(TYPES.IActionDispatcher)
    protected actionDispatcher: IActionDispatcher;

    @inject(TYPES.IFocusTracker)
    protected focusTracker: IFocusTracker;

    protected _editMode: string;
    protected onEditModeChangedEmitter = new Emitter<ValueChange<string>>();
    /**
     * Event that is fired when the edit mode of the diagram changes i.e. after a {@link SetEditModeAction} has been handled.
     */
    get onEditModeChanged(): Event<ValueChange<string>> {
        return this.onEditModeChangedEmitter.event;
    }

    protected _isDirty: boolean;
    protected onDirtyStateChangedEmitter = new Emitter<DirtyStateChange>();
    /**
     * Event that is fired when the dirty state of the diagram changes i.e. after a {@link SetDirtyStateAction} has been handled.
     */
    get onDirtyStateChanged(): Event<DirtyStateChange> {
        return this.onDirtyStateChangedEmitter.event;
    }

    /**
     * Event that is fired when the model root of the diagram changes i.e. after the `CommandStack` has processed a model update.
     */
    get onModelRootChanged(): Event<Readonly<GModelRoot>> {
        return this.modelChangeService.onModelRootChanged;
    }

    /**
     * Event that is fired when the focus state of the diagram changes i.e. after a {@link FocusStateChangedAction} has been handled
     * by the {@link IFocusTracker}.
     */
    get onFocusChanged(): Event<FocusChange> {
        return this.focusTracker.onFocusChanged;
    }

    /**
     * Event that is fired when the selection of the diagram changes i.e. a selection change has been handled
     * by the {@link ISelectionService}.
     */
    get onSelectionChanged(): Event<SelectionChange> {
        return this.selectionService.onSelectionChanged;
    }

    /**
     * Event that is fired when the viewport of the diagram changes i.e. after the `CommandStack` has processed a viewport update.
     * By default, this event is only fired if the viewport was changed via a `SetViewportCommand` or `BoundsAwareViewportCommand`
     */
    get onViewportChanged(): Event<ViewportChange> {
        return this.modelChangeService.onViewportChanged;
    }

    protected toDispose = new DisposableCollection();

    @postConstruct()
    protected initialize(): void {
        this._editMode = this.diagramOptions.editMode ?? EditMode.EDITABLE;
        this.toDispose.push(this.onEditModeChangedEmitter, this.onDirtyStateChangedEmitter);
    }

    @preDestroy()
    dispose(): void {
        this.toDispose.dispose();
    }

    preLoadDiagram(): MaybePromise<void> {
        this.lazyInjector.getAll<IGModelRootListener>(TYPES.IGModelRootListener).forEach(listener => {
            this.onModelRootChanged(event => listener.modelRootChanged(event));
        });
        this.lazyInjector.getAll<IEditModeListener>(TYPES.IEditModeListener).forEach(listener => {
            this.onEditModeChanged(event => listener.editModeChanged(event.newValue, event.oldValue));
        });
    }

    get(args?: Args): EditorContext {
        return {
            selectedElementIds: Array.from(this.selectionService.getSelectedElementIDs()),
            lastMousePosition: this.mousePositionTracker.lastPositionOnDiagram,
            viewport: this.viewportData,
            canvasBounds: this.canvasBounds,
            args
        };
    }

    getWithSelection(selectedElementIds: string[], args?: Args): EditorContext {
        return {
            selectedElementIds,
            lastMousePosition: this.mousePositionTracker.lastPositionOnDiagram,
            viewport: this.viewportData,
            canvasBounds: this.canvasBounds,
            args
        };
    }

    handle(action: Action): Action | void {
        if (SetEditModeAction.is(action)) {
            this.handleSetEditModeAction(action);
        } else if (SetDirtyStateAction.is(action)) {
            this.handleSetDirtyStateAction(action);
        } else if (GetEditorContextAction.is(action)) {
            return this.handleGetEditorContext(action);
        }
    }

    protected handleGetEditorContext(action: GetEditorContextAction): EditorContextResult {
        return EditorContextResult.create(this.get(), { responseId: action.requestId });
    }

    protected handleSetEditModeAction(action: SetEditModeAction): void {
        const oldValue = this._editMode;
        this._editMode = action.editMode;
        this.onEditModeChangedEmitter.fire({ newValue: this.editMode, oldValue });
    }

    protected handleSetDirtyStateAction(action: SetDirtyStateAction): void {
        if (action.isDirty !== this._isDirty) {
            this._isDirty = action.isDirty;
            this.onDirtyStateChangedEmitter.fire(action);
        }
    }

    get sourceUri(): string | undefined {
        return this.diagramOptions.sourceUri;
    }

    get editMode(): string {
        return this._editMode;
    }

    get diagramType(): string {
        return this.diagramOptions.diagramType;
    }

    get clientId(): string {
        return this.diagramOptions.clientId;
    }

    get modelRoot(): Readonly<GModelRoot> {
        if (!this.modelChangeService.currentRoot) {
            throw new Error('Model root not available yet');
        }
        return this.modelChangeService.currentRoot;
    }

    get viewport(): Readonly<GModelRoot & Viewport> | undefined {
        return this.modelRoot ? findParentByFeature(this.modelRoot, isViewport) : undefined;
    }

    get viewportData(): Readonly<Viewport> {
        const viewport = this.viewport;
        // default values aligned with GetViewportCommand
        return {
            scroll: viewport?.scroll ?? Point.ORIGIN,
            zoom: viewport?.zoom ?? 1
        };
    }

    get canvasBounds(): Readonly<Bounds> {
        // default value aligned with the initialization of canvasBounds in GModelRoot
        return this.modelRoot?.canvasBounds ?? Bounds.EMPTY;
    }

    get selectedElements(): Readonly<GModelElement>[] {
        return this.selectionService.getSelectedElements();
    }

    get isReadonly(): boolean {
        return this.editMode === EditMode.READONLY;
    }

    get isDirty(): boolean {
        return this._isDirty;
    }
}

export type EditorContextServiceProvider = () => Promise<IEditorContextService>;
