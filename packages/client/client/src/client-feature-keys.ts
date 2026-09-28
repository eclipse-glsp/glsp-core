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
import type { GLSPFeatureKey } from '@eclipse-glsp/sprotty';
import { SprottyFeature } from '@eclipse-glsp/sprotty/lib/feature-keys';

/**
 * The {@link GLSPFeatureKey}s of all GLSP client features.
 *
 * Use these keys to reference a feature in a container configuration without importing its implementation, e.g.
 * `{ remove: GLSPClientFeature.ToolPalette }` or `{ replace: defineFeature(GLSPClientFeature.ToolPalette, () => import('./my-tool-palette-module')...) }`.
 * This file must not import any implementation, so that referencing a feature key does not load the feature.
 *
 * The keys of the wrapped sprotty modules ({@link SprottyFeature}) are included as well. Note that they refer to the
 * sprotty features, not to the corresponding GLSP tools: e.g. `EdgeEdit` and `Move` are the sprotty modules, whereas the GLSP
 * edge editing and element moving/resizing tools are `EdgeEditTool` and `ChangeBoundsTool`. Only some sprotty modules are
 * part of the default features (e.g. `EdgeEdit`, `Move`, `Open` and `Update` are not), removing a key that is not
 * configured has no effect and logs a warning.
 */
export const GLSPClientFeature = {
    ...SprottyFeature,
    Accessibility: 'glsp.accessibility',
    BaseView: 'glsp.baseView',
    Bounds: 'glsp.bounds',
    ChangeBoundsTool: 'glsp.changeBoundsTool',
    CommandPalette: 'glsp.commandPalette',
    ContextMenu: 'glsp.contextMenu',
    CopyPaste: 'glsp.copyPaste',
    Debug: 'glsp.debug',
    Decoration: 'glsp.decoration',
    Default: 'glsp.default',
    DeletionTool: 'glsp.deletionTool',
    EdgeCreationTool: 'glsp.edgeCreationTool',
    EdgeEditTool: 'glsp.edgeEditTool',
    ElementNavigation: 'glsp.elementNavigation',
    ElementTemplate: 'glsp.elementTemplate',
    Export: 'glsp.export',
    FocusTracker: 'glsp.focusTracker',
    Grid: 'glsp.grid',
    HelperLine: 'glsp.helperLine',
    Hover: 'glsp.hover',
    KeyboardControl: 'glsp.keyboardControl',
    KeyboardToolPalette: 'glsp.keyboardToolPalette',
    LabelEdit: 'glsp.labelEdit',
    LabelEditUi: 'glsp.labelEditUi',
    Layout: 'glsp.layout',
    MarkerNavigator: 'glsp.markerNavigator',
    MarqueeSelectionTool: 'glsp.marqueeSelectionTool',
    Navigation: 'glsp.navigation',
    NodeCreationTool: 'glsp.nodeCreationTool',
    Resize: 'glsp.resize',
    Routing: 'glsp.routing',
    SearchPalette: 'glsp.searchPalette',
    SearchPaletteDefaultSuggestions: 'glsp.searchPaletteDefaultSuggestions',
    Select: 'glsp.select',
    SourceModelWatcher: 'glsp.sourceModelWatcher',
    Status: 'glsp.status',
    SvgMetadata: 'glsp.svgMetadata',
    Toast: 'glsp.toast',
    ToolFocusLoss: 'glsp.toolFocusLoss',
    ToolPalette: 'glsp.toolPalette',
    TypeHints: 'glsp.typeHints',
    Validation: 'glsp.validation',
    ViewKeyTools: 'glsp.viewKeyTools',
    Viewport: 'glsp.viewport',
    Zorder: 'glsp.zorder'
} as const satisfies Record<string, GLSPFeatureKey>;

/** The union of all GLSPClientFeature keys. */
export type GLSPClientFeature = (typeof GLSPClientFeature)[keyof typeof GLSPClientFeature];
