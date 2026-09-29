/********************************************************************************
 * Copyright (c) 2021-2026 EclipseSource and others.
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
import { Action, Disposable, Emitter, Event, IActionHandler, ICommand, ViewerOptions } from '@eclipse-glsp/sprotty';
import { inject, injectable, preDestroy } from 'inversify';
import { TYPES } from '../../types';
import { FocusStateChangedAction } from './focus-state-change-action';

export interface FocusChange {
    hasFocus: boolean;
    focusElement: HTMLOrSVGElement | null;
    diagramElement: HTMLElement | null;
}

/**
 * Tracks the focus state of the diagram by handling {@link FocusStateChangedAction}s.
 * Emits a {@link FocusChange} event when the focus state changes.
 * Allows querying of the current focus state and the focused root diagram element and the currently focused element within the diagram.
 * Consumers should inject it via {@link TYPES.IFocusTracker}. The default implementation is {@link FocusTracker}.
 */
export interface IFocusTracker extends IActionHandler, Disposable {
    /** Event that is fired when the focus state of the diagram changes. */
    readonly onFocusChanged: Event<FocusChange>;
    /** Whether the diagram currently has the focus. */
    readonly hasFocus: boolean;
    /** The element that had the focus when the focus state changed the last time. */
    readonly focusElement: HTMLOrSVGElement | null;
    /** The root element of the diagram. */
    readonly diagramElement: HTMLElement | null;
}

/**
 * The default {@link IFocusTracker} implementation.
 */
@injectable()
export class FocusTracker implements IFocusTracker {
    protected inActiveCssClass = 'inactive';
    protected _hasFocus = true;
    protected _focusElement: HTMLOrSVGElement | null;
    protected _diagramElement: HTMLElement | null;

    @inject(TYPES.ViewerOptions) protected options: ViewerOptions;

    protected onFocusChangedEmitter = new Emitter<FocusChange>();
    /**
     * Event that is fired when the focus state of the diagram changes i.e. after a {@link FocusStateChangedAction} has been handled.
     */
    get onFocusChanged(): Event<FocusChange> {
        return this.onFocusChangedEmitter.event;
    }

    get hasFocus(): boolean {
        return this._hasFocus;
    }

    get focusElement(): HTMLOrSVGElement | null {
        return this._focusElement;
    }

    get diagramElement(): HTMLElement | null {
        return this._diagramElement;
    }

    handle(action: Action): void | Action | ICommand {
        if (!FocusStateChangedAction.is(action)) {
            return;
        }

        this._hasFocus = action.hasFocus;
        this._focusElement = document.activeElement as HTMLOrSVGElement | null;
        this._diagramElement = document.getElementById(this.options.baseDiv);
        if (!this._diagramElement) {
            return;
        }
        if (this.hasFocus) {
            if (this._diagramElement.classList.contains(this.inActiveCssClass)) {
                this._diagramElement.classList.remove(this.inActiveCssClass);
            }
        } else {
            this._diagramElement.classList.add(this.inActiveCssClass);
        }
        this.onFocusChangedEmitter.fire({ hasFocus: this.hasFocus, focusElement: this.focusElement, diagramElement: this.diagramElement });
    }

    @preDestroy()
    dispose(): void {
        this.onFocusChangedEmitter.dispose();
    }
}
