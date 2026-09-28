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
import {
    FeatureDefinition,
    sprottyButtonFeatureDef,
    sprottyEdgeIntersectionFeatureDef,
    sprottyEdgeLayoutFeatureDef,
    sprottyExpandFeatureDef,
    sprottyFadeFeatureDef,
    sprottyModelSourceFeatureDef
} from '@eclipse-glsp/sprotty';
import { defaultFeatureDef } from './base/default-feature';
import { accessibilityFeatureDef } from './features/accessibility/accessibility-feature';
import { boundsFeatureDef } from './features/bounds/bounds-feature';
import { resizeFeatureDef } from './features/change-bounds/resize/resize-feature';
import { commandPaletteFeatureDef } from './features/command-palette/command-palette-feature';
import { contextMenuFeatureDef } from './features/context-menu/context-menu-feature';
import { copyPasteFeatureDef } from './features/copy-paste/copy-paste-features';
import { debugFeatureDef } from './features/debug/debug-feature';
import { decorationFeatureDef } from './features/decoration/decoration-feature';
import { elementTemplateFeatureDef } from './features/element-template/element-template-feature';
import { exportFeatureDef } from './features/export/export-features';
import { gridFeatureDef } from './features/grid/grid-feature';
import { helperLineFeatureDef } from './features/helper-lines/helper-line-feature';
import { typeHintsFeatureDef } from './features/hints/type-hints-feature';
import { hoverFeatureDef } from './features/hover/hover-feature';
import { labelEditUiFeatureDef } from './features/label-edit-ui/label-edit-ui-feature';
import { labelEditFeatureDef } from './features/label-edit/label-edit-feature';
import { layoutFeatureDef } from './features/layout/layout-feature';
import { navigationFeatureDef } from './features/navigation/navigation-feature';
import { routingFeatureDef } from './features/routing/routing-feature';
import { searchPaletteDefaultSuggestionsFeatureDef, searchPaletteFeatureDef } from './features/search-palette/search-palette-feature';
import { selectFeatureDef } from './features/select/select-feature';
import { sourceModelWatcherFeatureDef } from './features/source-model-watcher/source-model-watcher-feature';
import { statusFeatureDef } from './features/status/status-feature';
import { svgMetadataFeatureDef } from './features/svg-metadata/svg-metadata-feature';
import { toolPaletteFeatureDef } from './features/tool-palette/tool-palette-feature';
import { changeBoundsToolFeatureDef } from './features/tools/change-bounds/change-bounds-tool-feature';
import { deletionToolFeatureDef } from './features/tools/deletion/deletion-tool-feature';
import { edgeCreationToolFeatureDef } from './features/tools/edge-creation/edge-creation-feature';
import { edgeEditToolFeatureDef } from './features/tools/edge-edit/edge-edit-feature';
import { marqueeSelectionToolFeatureDef } from './features/tools/marquee-selection/marquee-selection-feature';
import { nodeCreationToolFeatureDef } from './features/tools/node-creation/node-creation-feature';
import { toolFocusLossFeatureDef } from './features/tools/tool-focus-loss-feature';
import { markerNavigatorFeatureDef, validationFeatureDef } from './features/validation/validation-features';
import { viewportFeatureDef } from './features/viewport/viewport-features';
import { zorderFeatureDef } from './features/zorder/zorder-feature';

/**
 * The default features of a GLSP diagram container (see `initializeDiagramContainer`).
 * Each feature is defined next to its module (e.g. `features/tools/change-bounds/change-bounds-tool-feature.ts`)
 * and the module derives its options from the definition (see {@link FeatureDefinition.toModuleOptions}).
 *
 * Every feature is loaded lazily: its implementation (including stylesheets) is only evaluated if the feature is part of
 * the resolved container configuration. The wrapped sprotty modules are the exception, they are part of `@eclipse-glsp/sprotty`,
 * which is always loaded. As the package is published as CommonJS, bundlers still include removed features in the bundle.
 * Remove a default feature by key, e.g. `{ remove: GLSPClientFeature.ToolPalette }`,
 * or replace it with a definition that uses the same key.
 */
export const DEFAULT_FEATURES: readonly FeatureDefinition[] = [
    defaultFeatureDef,
    sprottyButtonFeatureDef,
    sprottyEdgeIntersectionFeatureDef,
    sprottyEdgeLayoutFeatureDef,
    sprottyExpandFeatureDef,
    exportFeatureDef,
    sprottyFadeFeatureDef,
    boundsFeatureDef,
    commandPaletteFeatureDef,
    contextMenuFeatureDef,
    decorationFeatureDef,
    labelEditFeatureDef,
    hoverFeatureDef,
    selectFeatureDef,
    copyPasteFeatureDef,
    viewportFeatureDef,
    labelEditUiFeatureDef,
    layoutFeatureDef,
    markerNavigatorFeatureDef,
    typeHintsFeatureDef,
    sprottyModelSourceFeatureDef,
    sourceModelWatcherFeatureDef,
    navigationFeatureDef,
    routingFeatureDef,
    toolPaletteFeatureDef,
    edgeCreationToolFeatureDef,
    edgeEditToolFeatureDef,
    deletionToolFeatureDef,
    elementTemplateFeatureDef,
    nodeCreationToolFeatureDef,
    changeBoundsToolFeatureDef,
    marqueeSelectionToolFeatureDef,
    toolFocusLossFeatureDef,
    validationFeatureDef,
    zorderFeatureDef,
    svgMetadataFeatureDef,
    statusFeatureDef,
    resizeFeatureDef,
    searchPaletteFeatureDef,
    searchPaletteDefaultSuggestionsFeatureDef
];

/**
 * Lazily loaded definitions of optional (i.e. non-default) client features.
 * Add them to the container configuration, e.g. `{ add: GLSPOptionalFeatures.Grid }`.
 */
export const GLSPOptionalFeatures = {
    Accessibility: accessibilityFeatureDef,
    Debug: debugFeatureDef,
    Grid: gridFeatureDef,
    HelperLine: helperLineFeatureDef
} as const satisfies Record<string, FeatureDefinition>;
