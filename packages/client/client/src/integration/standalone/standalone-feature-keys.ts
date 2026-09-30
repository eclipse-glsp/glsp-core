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
/**
 * The `GLSPFeatureKey`s of the GLSP client features that are intended for the standalone deployment of GLSP
 * (i.e. plain webapp), see `STANDALONE_FEATURES`. All keys use the `glsp.standalone.` namespace. When integrated into an application frame (e.g Theia/VS Code) these
 * features are typically omitted and/or replaced with application native features.
 *
 * This file must not import any implementation, so that referencing a feature key does not load the feature.
 */
export const GLSPStandaloneFeature = {
    CopyPaste: 'glsp.standalone.copyPaste',
    Default: 'glsp.standalone.default',
    Export: 'glsp.standalone.export',
    MarkerNavigator: 'glsp.standalone.markerNavigator',
    Resize: 'glsp.standalone.resize',
    Save: 'glsp.standalone.save',
    SearchPalette: 'glsp.standalone.searchPalette',
    Select: 'glsp.standalone.select',
    Shortcuts: 'glsp.standalone.shortcuts',
    UndoRedo: 'glsp.standalone.undoRedo',
    Viewport: 'glsp.standalone.viewport'
} as const satisfies Record<string, `glsp.standalone.${string}`>;

/** The union of all GLSPStandaloneFeature keys. */
export type GLSPStandaloneFeature = (typeof GLSPStandaloneFeature)[keyof typeof GLSPStandaloneFeature];
