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
import { GModelElement, SPROTTY_TYPES } from '@eclipse-glsp/sprotty';
import { Container, injectable, interfaces } from 'inversify';
import { beforeEach, describe, expect, it } from 'vitest';
import { defaultModule } from '../base/default.module';
import { IDiagramOptions } from '../base/model/diagram-loader';
import { TYPES } from '../types';
import { exportModule } from './export/export-modules';
import { GLSPSvgExporter } from './export/glsp-svg-exporter';
import { NavigationTargetResolver } from './navigation/navigation-target-resolver';
import { navigationModule } from './navigation/navigation-module';
import { MarqueeUtil } from './tools/marquee-selection/marquee-behavior';
import { marqueeSelectionToolModule } from './tools/marquee-selection/marquee-selection-module';
import { GModelElementComparator, MarkerNavigator } from './validation/marker-navigator';
import { ValidationFeedbackEmitter } from './validation/validate';
import { markerNavigatorModule, validationModule } from './validation/validation-modules';

@injectable()
class CustomComparator extends GModelElementComparator {
    override compare(_one: GModelElement, _other: GModelElement): number {
        return 0;
    }
}

describe('feature module service bindings', () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
        container.load(defaultModule, exportModule, validationModule, markerNavigatorModule, navigationModule, marqueeSelectionToolModule);
        container.bind(TYPES.IDiagramOptions).toConstantValue(<IDiagramOptions>(<unknown>{
            clientId: 'client1',
            diagramType: 'diagramType',
            glspClientProvider: async () => ({}) as any
        }));
    });

    const services: [string, interfaces.ServiceIdentifier, interfaces.ServiceIdentifier][] = [
        ['GLSPSvgExporter', TYPES.ISvgExporter, GLSPSvgExporter],
        ['GLSPSvgExporter (sprotty symbol)', SPROTTY_TYPES.SvgExporter, GLSPSvgExporter],
        ['ValidationFeedbackEmitter', TYPES.IValidationFeedbackEmitter, ValidationFeedbackEmitter],
        ['MarkerNavigator', TYPES.IMarkerNavigator, MarkerNavigator],
        ['GModelElementComparator', TYPES.IGModelElementComparator, GModelElementComparator],
        ['NavigationTargetResolver', TYPES.INavigationTargetResolver, NavigationTargetResolver],
        ['MarqueeUtil', TYPES.IMarqueeUtil, MarqueeUtil]
    ];

    it.each(services)('should resolve the same %s instance via symbol and class', (_name, symbol, clazz) => {
        expect(container.get(symbol)).toBe(container.get(clazz));
    });

    it('should propagate a rebind of the element comparator class to the service symbol', () => {
        container.rebind(GModelElementComparator).to(CustomComparator).inSingletonScope();
        const comparator = container.get(TYPES.IGModelElementComparator);
        expect(comparator).toBeInstanceOf(CustomComparator);
        expect(container.get<MarkerNavigator>(TYPES.IMarkerNavigator)['markerComparator']).toBe(comparator);
    });
});
