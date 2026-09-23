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
import { BindingTarget, MultiBinding, NavigationModule, NavigationTargetProvider, NavigationTargetResolver } from '@eclipse-glsp/server';
import { WorkflowNavigationTargetResolver } from '../../model/workflow-navigation-target-resolver';
import { NextNodeNavigationTargetProvider } from '../../provider/next-node-navigation-target-provider';
import { NodeDocumentationNavigationTargetProvider } from '../../provider/node-documentation-navigation-target-provider';
import { PreviousNodeNavigationTargetProvider } from '../../provider/previous-node-navigation-target-provider';

/**
 * Navigation feature with the workflow navigation target resolver and providers.
 * Replaces the corresponding GLSP default module in the workflow diagram setup.
 */
export class WorkflowNavigationModule extends NavigationModule {
    protected override bindNavigationTargetResolver(): BindingTarget<NavigationTargetResolver> | undefined {
        return WorkflowNavigationTargetResolver;
    }

    protected override configureNavigationTargetProviders(binding: MultiBinding<NavigationTargetProvider>): void {
        super.configureNavigationTargetProviders(binding);
        binding.add(NextNodeNavigationTargetProvider);
        binding.add(PreviousNodeNavigationTargetProvider);
        binding.add(NodeDocumentationNavigationTargetProvider);
    }
}
