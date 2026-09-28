/********************************************************************************
 * Copyright (c) 2023-2026 EclipseSource and others.
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
import { FeatureDefinition, ModuleConfiguration } from '@eclipse-glsp/sprotty';
import { standaloneDefaultFeatureDef } from './base/standalone-default-feature';
import { standaloneCopyPasteFeatureDef } from './features/copy-paste/standalone-copy-paste-feature';
import { standaloneExportFeatureDef } from './features/export/standalone-export-feature';
import { standaloneResizeFeatureDef } from './features/resize/standalone-resize-feature';
import { saveFeatureDef } from './features/save/save-feature';
import { standaloneSearchPaletteFeatureDef } from './features/search-palette/standalone-search-palette-feature';
import { standaloneSelectFeatureDef } from './features/select/standalone-select-feature';
import { standaloneShortcutsFeatureDef } from './features/shortcuts/standalone-shortcuts-feature';
import { undoRedoFeatureDef } from './features/undo-redo/undo-redo-feature';
import { standaloneMarkerNavigatorFeatureDef } from './features/validation/standalone-marker-navigator-feature';
import { standaloneViewportFeatureDef } from './features/viewport/standalone-viewport-feature';

/**
 * The features that are intended for the standalone deployment of GLSP (i.e. plain webapp).
 * When integrated into an application frame (e.g Theia/VS Code) these features are typically omitted and/or replaced
 * with application native features.
 *
 * Most standalone features extend a default feature and are dropped if the extended default feature is removed.
 */
export const STANDALONE_FEATURES: readonly FeatureDefinition[] = [
    standaloneViewportFeatureDef,
    standaloneCopyPasteFeatureDef,
    standaloneMarkerNavigatorFeatureDef,
    standaloneSelectFeatureDef,
    standaloneExportFeatureDef,
    standaloneDefaultFeatureDef,
    standaloneShortcutsFeatureDef,
    standaloneResizeFeatureDef,
    standaloneSearchPaletteFeatureDef,
    saveFeatureDef,
    undoRedoFeatureDef
];

/**
 * Configuration that adds all {@link STANDALONE_FEATURES}.
 */
export const STANDALONE_MODULE_CONFIG: ModuleConfiguration = {
    add: [...STANDALONE_FEATURES]
};
