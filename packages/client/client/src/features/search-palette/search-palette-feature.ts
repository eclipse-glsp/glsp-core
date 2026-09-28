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
import { FeatureDefinition, defineFeature } from '@eclipse-glsp/sprotty';
import { GLSPClientFeature } from '../../client-feature-keys';

/** Lazily loaded definition of the `searchPaletteModule` feature (see {@link GLSPClientFeature.SearchPalette}). */
export const searchPaletteFeatureDef: FeatureDefinition = defineFeature(GLSPClientFeature.SearchPalette, () =>
    import('./search-palette-module').then(m => m.searchPaletteModule)
);

/** Lazily loaded definition of the `searchPaletteDefaultSuggestionsModule` feature (see {@link GLSPClientFeature.SearchPaletteDefaultSuggestions}). */
export const searchPaletteDefaultSuggestionsFeatureDef: FeatureDefinition = defineFeature(
    GLSPClientFeature.SearchPaletteDefaultSuggestions,
    () => import('./search-palette-module').then(m => m.searchPaletteDefaultSuggestionsModule),
    { extends: GLSPClientFeature.SearchPalette }
);
