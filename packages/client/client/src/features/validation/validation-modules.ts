/********************************************************************************
 * Copyright (c) 2019-2026 EclipseSource and others.
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
    FeatureModule,
    SetMarkersAction,
    bindAsService,
    configureActionHandler,
    configureCommand
} from '@eclipse-glsp/sprotty';
import { TYPES } from '../../types';
import { markerNavigatorFeatureDef, validationFeatureDef } from './validation-features';
import {
    GModelElementComparator,
    LeftToRightTopToBottomComparator,
    MarkerNavigator,
    NavigateToMarkerAction,
    NavigateToMarkerActionHandler
} from './marker-navigator';
import { ApplyMarkersCommand, DeleteMarkersCommand, SetMarkersActionHandler, ValidationFeedbackEmitter } from './validate';

export const validationModule = new FeatureModule((bind, _unbind, isBound) => {
    const context = { bind, isBound };
    configureActionHandler(context, SetMarkersAction.KIND, SetMarkersActionHandler);
    configureCommand(context, ApplyMarkersCommand);
    configureCommand(context, DeleteMarkersCommand);
    bindAsService(context, TYPES.IValidationFeedbackEmitter, ValidationFeedbackEmitter);
}, FeatureDefinition.toModuleOptions(validationFeatureDef));

export const markerNavigatorModule = new FeatureModule((bind, _unbind, isBound) => {
    bind(GModelElementComparator).to(LeftToRightTopToBottomComparator).inSingletonScope();
    // Resolve the symbol via the class to keep existing `rebind(GModelElementComparator)` customizations working
    bind(TYPES.IGModelElementComparator).toService(GModelElementComparator);
    bindAsService(bind, TYPES.IMarkerNavigator, MarkerNavigator);
    configureActionHandler({ bind, isBound }, NavigateToMarkerAction.KIND, NavigateToMarkerActionHandler);
}, FeatureDefinition.toModuleOptions(markerNavigatorFeatureDef));
