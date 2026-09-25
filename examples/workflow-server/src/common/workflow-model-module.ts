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
import { BindingTarget, DiagramConfiguration, GModelSourceModelModule, SourceModelStorage } from '@eclipse-glsp/server';
import { WorkflowDiagramConfiguration } from './workflow-diagram-configuration';

/**
 * The source model module of the workflow diagram language. The workflow diagram uses the GModel as source model,
 * the concrete {@link SourceModelStorage} is provided by the launcher (e.g. file-based for node, mock for browser).
 */
export class WorkflowModelModule extends GModelSourceModelModule {
    constructor(protected readonly sourceModelStorage: () => BindingTarget<SourceModelStorage>) {
        super();
    }

    override get diagramType(): string {
        return 'workflow-diagram';
    }

    protected override bindSourceModelStorage(): BindingTarget<SourceModelStorage> {
        return this.sourceModelStorage();
    }

    protected override bindDiagramConfiguration(): BindingTarget<DiagramConfiguration> {
        return WorkflowDiagramConfiguration;
    }
}
