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

import type { GLSPFeatureKey } from '@eclipse-glsp/protocol';

/**
 * The {@link GLSPFeatureKey}s of the sprotty feature modules that are wrapped as GLSP feature modules
 * (see `feature-modules.ts`).
 */
export const SprottyFeature = {
    Button: 'glsp.sprotty.button',
    EdgeEdit: 'glsp.sprotty.edgeEdit',
    EdgeIntersection: 'glsp.sprotty.edgeIntersection',
    EdgeJunction: 'glsp.sprotty.edgeJunction',
    EdgeLayout: 'glsp.sprotty.edgeLayout',
    Expand: 'glsp.sprotty.expand',
    Fade: 'glsp.sprotty.fade',
    ModelSource: 'glsp.sprotty.modelSource',
    Move: 'glsp.sprotty.move',
    Open: 'glsp.sprotty.open',
    Update: 'glsp.sprotty.update'
} as const satisfies Record<string, GLSPFeatureKey>;

/** The union of all SprottyFeature keys. */
export type SprottyFeature = (typeof SprottyFeature)[keyof typeof SprottyFeature];
