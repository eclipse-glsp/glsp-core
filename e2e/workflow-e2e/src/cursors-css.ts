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
export const CursorCSS = {
    DEFAULT: 'default-mode',
    OVERLAP_FORBIDDEN: 'overlap-forbidden-mode',
    NODE_CREATION: 'node-creation-mode',
    EDGE_CREATION_SOURCE: 'edge-creation-select-source-mode',
    EDGE_CREATION_TARGET: 'edge-creation-select-target-mode',
    EDGE_RECONNECT: 'edge-reconnect-select-target-mode',
    EDGE_CHECK_PENDING: 'edge-check-pending-mode',
    OPERATION_NOT_ALLOWED: 'edge-modification-not-allowed-mode',
    ELEMENT_DELETION: 'element-deletion-mode',
    RESIZE_NESW: 'resize-nesw-mode',
    RESIZE_NWSE: 'resize-nwse-mode',
    RESIZE_NW: 'resize-nw-mode',
    RESIZE_N: 'resize-n-mode',
    RESIZE_NE: 'resize-ne-mode',
    RESIZE_E: 'resize-e-mode',
    RESIZE_SE: 'resize-se-mode',
    RESIZE_S: 'resize-s-mode',
    RESIZE_SW: 'resize-sw-mode',
    RESIZE_W: 'resize-w-mode',
    MOVE: 'move-mode',
    MARQUEE: 'marquee-mode'
} as const;

export type CursorCSS = (typeof CursorCSS)[keyof typeof CursorCSS];
