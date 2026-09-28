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

import { FeatureKey } from '@eclipse-glsp/protocol';
import { FeatureModule } from '@eclipse-glsp/protocol/di';
import { SprottyFeature } from './feature-keys';
import sprottyDefaultModule from 'sprotty/lib/base/di.config';
import buttonDiConfig from 'sprotty/lib/features/button/di.config';
import edgeIntersectionDiConfig from 'sprotty/lib/features/edge-intersection/di.config';
import edgeJunctionDiConfig from 'sprotty/lib/features/edge-junction/di.config';
import edgeLayoutDiConfig from 'sprotty/lib/features/edge-layout/di.config';
import { edgeEditModule as edgeEditDiConfig } from 'sprotty/lib/features/edit/di.config';
import expandDiConfig from 'sprotty/lib/features/expand/di.config';
import fadeDiConfig from 'sprotty/lib/features/fade/di.config';
import moveDiConfig from 'sprotty/lib/features/move/di.config';
import openDiConfig from 'sprotty/lib/features/open/di.config';
import updateDiConfig from 'sprotty/lib/features/update/di.config';
import modelSourceDiConfig from 'sprotty/lib/model-source/di.config';

export const sprottyButtonModule = new FeatureModule(buttonDiConfig.registry, { featureId: FeatureKey.toId(SprottyFeature.Button) });
export const sprottyEdgeEditModule = new FeatureModule(edgeEditDiConfig.registry, { featureId: FeatureKey.toId(SprottyFeature.EdgeEdit) });
export const sprottyEdgeIntersectionModule = new FeatureModule(edgeIntersectionDiConfig.registry, {
    featureId: FeatureKey.toId(SprottyFeature.EdgeIntersection)
});
export const sprottyEdgeLayoutModule = new FeatureModule(edgeLayoutDiConfig.registry, {
    featureId: FeatureKey.toId(SprottyFeature.EdgeLayout)
});
export const sprottyExpandModule = new FeatureModule(expandDiConfig.registry, { featureId: FeatureKey.toId(SprottyFeature.Expand) });
export const sprottyFadeModule = new FeatureModule(fadeDiConfig.registry, { featureId: FeatureKey.toId(SprottyFeature.Fade) });
export const sprottyModelSourceModule = new FeatureModule(modelSourceDiConfig.registry, {
    featureId: FeatureKey.toId(SprottyFeature.ModelSource)
});
export const sprottyMoveModule = new FeatureModule(moveDiConfig.registry, { featureId: FeatureKey.toId(SprottyFeature.Move) });
export const sprottyOpenModule = new FeatureModule(openDiConfig.registry, { featureId: FeatureKey.toId(SprottyFeature.Open) });
export const sprottyUpdateModule = new FeatureModule(updateDiConfig.registry, { featureId: FeatureKey.toId(SprottyFeature.Update) });
export const sprottyEdgeJunctionModule = new FeatureModule(edgeJunctionDiConfig.registry, {
    featureId: FeatureKey.toId(SprottyFeature.EdgeJunction)
});

export { sprottyDefaultModule };
