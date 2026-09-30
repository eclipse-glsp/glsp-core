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
import { FeatureDefinition, defineFeature } from '@eclipse-glsp/protocol/di';
import { SprottyFeature } from './feature-keys';
import {
    sprottyButtonModule,
    sprottyEdgeEditModule,
    sprottyEdgeIntersectionModule,
    sprottyEdgeJunctionModule,
    sprottyEdgeLayoutModule,
    sprottyExpandModule,
    sprottyFadeModule,
    sprottyModelSourceModule,
    sprottyMoveModule,
    sprottyOpenModule,
    sprottyUpdateModule
} from './feature-modules';

// The wrapped sprotty modules are part of this package and always loaded, so their definitions load them synchronously.

/** Definition of the `sprottyButtonModule` feature (see {@link SprottyFeature.Button}). */
export const sprottyButtonFeatureDef: FeatureDefinition = defineFeature(SprottyFeature.Button, () => sprottyButtonModule);

/** Definition of the `sprottyEdgeEditModule` feature (see {@link SprottyFeature.EdgeEdit}). */
export const sprottyEdgeEditFeatureDef: FeatureDefinition = defineFeature(SprottyFeature.EdgeEdit, () => sprottyEdgeEditModule);

/** Definition of the `sprottyEdgeIntersectionModule` feature (see {@link SprottyFeature.EdgeIntersection}). */
export const sprottyEdgeIntersectionFeatureDef: FeatureDefinition = defineFeature(
    SprottyFeature.EdgeIntersection,
    () => sprottyEdgeIntersectionModule
);

/** Definition of the `sprottyEdgeLayoutModule` feature (see {@link SprottyFeature.EdgeLayout}). */
export const sprottyEdgeLayoutFeatureDef: FeatureDefinition = defineFeature(SprottyFeature.EdgeLayout, () => sprottyEdgeLayoutModule);

/** Definition of the `sprottyExpandModule` feature (see {@link SprottyFeature.Expand}). */
export const sprottyExpandFeatureDef: FeatureDefinition = defineFeature(SprottyFeature.Expand, () => sprottyExpandModule);

/** Definition of the `sprottyFadeModule` feature (see {@link SprottyFeature.Fade}). */
export const sprottyFadeFeatureDef: FeatureDefinition = defineFeature(SprottyFeature.Fade, () => sprottyFadeModule);

/** Definition of the `sprottyModelSourceModule` feature (see {@link SprottyFeature.ModelSource}). */
export const sprottyModelSourceFeatureDef: FeatureDefinition = defineFeature(SprottyFeature.ModelSource, () => sprottyModelSourceModule);

/** Definition of the `sprottyMoveModule` feature (see {@link SprottyFeature.Move}). */
export const sprottyMoveFeatureDef: FeatureDefinition = defineFeature(SprottyFeature.Move, () => sprottyMoveModule);

/** Definition of the `sprottyOpenModule` feature (see {@link SprottyFeature.Open}). */
export const sprottyOpenFeatureDef: FeatureDefinition = defineFeature(SprottyFeature.Open, () => sprottyOpenModule);

/** Definition of the `sprottyUpdateModule` feature (see {@link SprottyFeature.Update}). */
export const sprottyUpdateFeatureDef: FeatureDefinition = defineFeature(SprottyFeature.Update, () => sprottyUpdateModule);

/** Definition of the `sprottyEdgeJunctionModule` feature (see {@link SprottyFeature.EdgeJunction}). */
export const sprottyEdgeJunctionFeatureDef: FeatureDefinition = defineFeature(SprottyFeature.EdgeJunction, () => sprottyEdgeJunctionModule);
