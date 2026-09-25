/********************************************************************************
 * Copyright (c) 2026 EclipseSource and others.
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
import { CapabilityKey } from './capability';

/**
 * The keys of all GLSP-defined diagram capabilities. Each key is a {@link CapabilityKey} with the reserved `glsp.` prefix
 * (checked at compile time), adopters use their own prefix for custom capabilities.
 */
export const GLSPCapability = {
    /** Moving and resizing elements (`ChangeBoundsOperation`). */
    ChangeBounds: 'glsp.changeBounds',
    /** Deleting elements (`DeleteElementOperation`). */
    Delete: 'glsp.delete',
    /** Editing labels (`ApplyLabelEditOperation`). Options: `LabelEditCapabilityOptions`. */
    LabelEdit: 'glsp.labelEdit',
    /** Cut, copy & paste (`RequestClipboardDataAction`, `CutOperation`, `PasteOperation`). */
    Clipboard: 'glsp.clipboard',
    /** Reconnecting edges and changing routing points (`ReconnectEdgeOperation`, `ChangeRoutingPointsOperation`). */
    EdgeEdit: 'glsp.edgeEdit',
    /** Undo & redo (`UndoAction`, `RedoAction`). */
    UndoRedo: 'glsp.undoRedo',
    /** Navigation to/from model elements (`RequestNavigationTargetsAction`, `ResolveNavigationTargetAction`). */
    Navigation: 'glsp.navigation',
    /** Model validation (`RequestMarkersAction`). Options: `ValidationCapabilityOptions`. */
    Validation: 'glsp.validation',
    /** Layouting (`LayoutOperation`, `ComputedBoundsAction`). Options: `LayoutCapabilityOptions`. */
    Layout: 'glsp.layout',
    /** Type hints and edge creation checks (`RequestTypeHintsAction`, `RequestCheckEdgeAction`). */
    TypeHints: 'glsp.typeHints',
    /** Hover popups (`RequestPopupModelAction`). */
    Popup: 'glsp.popup',
    /** Context actions like tool palette, command palette and context menu items (`RequestContextActions`). */
    ContextActions: 'glsp.contextActions'
} as const satisfies Record<string, CapabilityKey>;

/** The union of all GLSP capability keys, i.e. `'glsp.changeBounds' | 'glsp.delete' | ...`. */
export type GLSPCapability = (typeof GLSPCapability)[keyof typeof GLSPCapability];
