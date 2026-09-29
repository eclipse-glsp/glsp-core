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
    CenterAction,
    ClientMenuItem,
    GIssueSeverity,
    GModelElement,
    GModelRoot,
    IActionDispatcher,
    IActionHandler,
    IContextMenuItemProvider,
    KeyListener,
    Point,
    SelectAction,
    findParentByFeature,
    hasArrayProp,
    hasStringProp,
    isBoundsAware,
    isSelectable,
    matchesKeystroke
} from '@eclipse-glsp/sprotty';
import { inject, injectable } from 'inversify';
import { messages } from '../../base/messages';
import { ISelectionService } from '../../base/selection-service';
import { TYPES } from '../../types';
import { BoundsAwareModelElement, SelectableElement, getElements, isSelectableAndBoundsAware } from '../../utils/gmodel-util';
import { MarkerPredicates, collectIssueMarkers } from '../../utils/marker';
import { GIssueMarker } from './issue-marker';

export interface NavigateToMarkerAction extends Action {
    kind: typeof NavigateToMarkerAction.KIND;

    direction: MarkerNavigationDirection;
    selectedElementIds?: string[];
    severities: GIssueSeverity[];
}

export type MarkerNavigationDirection = 'next' | 'previous';

export namespace NavigateToMarkerAction {
    export const KIND = 'navigateToMarker';

    export function is(object: any): object is NavigateToMarkerAction {
        return Action.hasKind(object, KIND) && hasStringProp(object, 'direction') && hasArrayProp(object, 'severities');
    }

    export function create(options: {
        direction?: MarkerNavigationDirection;
        selectedElementIds?: string[];
        severities?: GIssueSeverity[];
    }): NavigateToMarkerAction {
        return {
            kind: KIND,
            direction: 'next',
            severities: MarkerNavigator.ALL_SEVERITIES,
            ...options
        };
    }
}
/**
 * Specifies the order of two model elements. Used by the {@link IMarkerNavigator} to determine the order of markers.
 * Consumers should inject it via {@link TYPES.IGModelElementComparator}.
 */
export interface IGModelElementComparator {
    /**
     * Compares the given elements.
     * @returns A negative number if `one` comes before `other`, a positive number if `one` comes after `other`, `0` otherwise.
     */
    compare(one: GModelElement, other: GModelElement): number;
}

/**
 * The base {@link IGModelElementComparator} that considers all elements equal. By default, it is rebound to
 * {@link LeftToRightTopToBottomComparator}.
 */
export class GModelElementComparator implements IGModelElementComparator {
    compare(_one: GModelElement, _other: GModelElement): number {
        return 0;
    }
}

/** Specifies the order of two selectable and bounds-aware elements left-to-right and top-to-bottom. */
@injectable()
export class LeftToRightTopToBottomComparator implements IGModelElementComparator {
    compare(one: GModelElement, other: GModelElement): number {
        const boundsOne = findParentByFeature(one, isSelectableAndBoundsAware);
        const boundsOther = findParentByFeature(other, isSelectableAndBoundsAware);
        if (boundsOne && boundsOther) {
            if (boundsOne.bounds.y !== boundsOther.bounds.y) {
                return boundsOne.bounds.y - boundsOther.bounds.y;
            }
            if (boundsOne.bounds.x !== boundsOther.bounds.x) {
                return boundsOne.bounds.x - boundsOther.bounds.x;
            }
        }
        return 0;
    }
}

/**
 * Specifies the next/previous marker in a graph model.
 * Consumers should inject it via {@link TYPES.IMarkerNavigator}. The default implementation is {@link MarkerNavigator}.
 */
export interface IMarkerNavigator {
    /**
     * Returns the marker that follows the given element.
     * @param root The model root.
     * @param current The current element. If `undefined`, the first marker is returned.
     * @param predicate Filters the markers that should be considered.
     */
    next(
        root: Readonly<GModelRoot>,
        current?: BoundsAwareModelElement,
        predicate?: (marker: GIssueMarker) => boolean
    ): GIssueMarker | undefined;

    /**
     * Returns the marker that precedes the given element.
     * @param root The model root.
     * @param current The current element. If `undefined`, the first marker is returned.
     * @param predicate Filters the markers that should be considered.
     */
    previous(
        root: Readonly<GModelRoot>,
        current?: BoundsAwareModelElement,
        predicate?: (marker: GIssueMarker) => boolean
    ): GIssueMarker | undefined;
}

/**
 * The default {@link IMarkerNavigator} implementation.
 * This navigator uses an {@link IGModelElementComparator} to determine the order of markers.
 */
@injectable()
export class MarkerNavigator implements IMarkerNavigator {
    static readonly ALL_SEVERITIES: GIssueSeverity[] = ['error', 'warning', 'info'];

    @inject(TYPES.IGModelElementComparator)
    protected markerComparator: IGModelElementComparator;

    next(
        root: Readonly<GModelRoot>,
        current?: BoundsAwareModelElement,
        predicate: (marker: GIssueMarker) => boolean = MarkerPredicates.ALL
    ): GIssueMarker | undefined {
        const markers = this.getMarkers(root, predicate);
        if (current === undefined) {
            return markers.length > 0 ? markers[0] : undefined;
        }
        return markers[this.getNextIndex(current, markers) % markers.length];
    }

    previous(
        root: Readonly<GModelRoot>,
        current?: BoundsAwareModelElement,
        predicate: (marker: GIssueMarker) => boolean = MarkerPredicates.ALL
    ): GIssueMarker | undefined {
        const markers = this.getMarkers(root, predicate);
        if (current === undefined) {
            return markers.length > 0 ? markers[0] : undefined;
        }
        return markers[this.getPreviousIndex(current, markers) % markers.length];
    }

    protected getMarkers(root: Readonly<GModelRoot>, predicate: (marker: GIssueMarker) => boolean): GIssueMarker[] {
        const markers = collectIssueMarkers(root);
        return markers.filter(predicate).sort((a, b) => this.markerComparator.compare(a, b));
    }

    protected getNextIndex(current: BoundsAwareModelElement, markers: GIssueMarker[]): number {
        for (let index = 0; index < markers.length; index++) {
            if (this.markerComparator.compare(markers[index], current) > 0) {
                return index;
            }
        }
        return 0;
    }

    protected getPreviousIndex(current: BoundsAwareModelElement, markers: GIssueMarker[]): number {
        for (let index = markers.length - 1; index >= 0; index--) {
            if (this.markerComparator.compare(markers[index], current) < 0) {
                return index;
            }
        }
        return markers.length - 1;
    }
}

@injectable()
export class NavigateToMarkerActionHandler implements IActionHandler {
    @inject(TYPES.IGModelElementComparator)
    protected markerComparator: IGModelElementComparator;

    @inject(TYPES.IMarkerNavigator)
    protected markerNavigator: IMarkerNavigator;

    @inject(TYPES.ISelectionService)
    protected selectionService: ISelectionService;

    @inject(TYPES.IActionDispatcher)
    protected actionDispatcher: IActionDispatcher;

    handle(action: NavigateToMarkerAction): void {
        const selected = this.getSelectedElements(action);
        const target = this.getTarget(action, selected);

        const selectableTarget = target ? findParentByFeature(target, isSelectable) : undefined;
        if (selectableTarget) {
            const deselectedElementsIDs = selected.map(e => e.id).filter(id => id !== selectableTarget.id);
            this.actionDispatcher.dispatch(SelectAction.create({ selectedElementsIDs: [selectableTarget.id], deselectedElementsIDs }));
            this.actionDispatcher.dispatch(CenterAction.create([selectableTarget.id]));
        }
    }

    protected getSelectedElements(action: NavigateToMarkerAction): SelectableElement[] {
        if (action.selectedElementIds && action.selectedElementIds.length > 0) {
            return getElements(this.selectionService.getModelRoot().index, action.selectedElementIds, isSelectable);
        }
        return this.selectionService.getSelectedElements();
    }

    protected getTarget(action: NavigateToMarkerAction, selected: GModelElement[]): GIssueMarker | undefined {
        const root = this.selectionService.getModelRoot();
        const target = selected.sort(this.markerComparator.compare).find(isBoundsAware);
        if (action.direction === 'previous') {
            return this.markerNavigator.previous(root, target, marker => this.matchesSeverities(action, marker));
        } else {
            return this.markerNavigator.next(root, target, marker => this.matchesSeverities(action, marker));
        }
    }

    protected matchesSeverities(action: NavigateToMarkerAction, marker: GIssueMarker): boolean {
        return marker.issues.find(issue => action.severities.includes(issue.severity)) !== undefined;
    }
}

@injectable()
export class MarkerNavigatorContextMenuItemProvider implements IContextMenuItemProvider {
    @inject(TYPES.ISelectionService) protected selectionService: ISelectionService;

    async getItems(root: Readonly<GModelRoot>, lastMousePosition?: Point): Promise<ClientMenuItem[]> {
        const selectedElementIds = Array.from(this.selectionService.getSelectedElementIDs());
        const hasMarkers = collectIssueMarkers(root).length > 0;
        return [
            {
                id: 'navigate',
                label: messages.context_menu.marker.navigation,
                group: 'navigate',
                actions: [],
                children: [
                    {
                        id: 'next-marker',
                        label: messages.context_menu.marker.next,
                        group: 'marker',
                        actions: [NavigateToMarkerAction.create({ direction: 'next', selectedElementIds })],
                        isEnabled: () => hasMarkers
                    },
                    {
                        id: 'previous-marker',
                        label: messages.context_menu.marker.previous,
                        group: 'marker',
                        actions: [NavigateToMarkerAction.create({ direction: 'previous', selectedElementIds })],
                        isEnabled: () => hasMarkers
                    }
                ]
            }
        ];
    }
}

@injectable()
export class MarkerNavigatorKeyListener extends KeyListener {
    override keyDown(_element: GModelElement, event: KeyboardEvent): Action[] {
        if (matchesKeystroke(event, 'Period', 'ctrl')) {
            return [NavigateToMarkerAction.create({ direction: 'next' })];
        } else if (matchesKeystroke(event, 'Comma', 'ctrl')) {
            return [NavigateToMarkerAction.create({ direction: 'previous' })];
        }
        return [];
    }
}
