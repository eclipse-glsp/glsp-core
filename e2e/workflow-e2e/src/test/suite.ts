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
import type { TestDetails, TestInfo } from '@playwright/test';
import type { WorkflowSuiteName } from './suites';
import type { WorkflowTest, WorkflowTestContext, WorkflowTestFixtures } from './workflow-test';

/**
 * Executable body of a reusable Workflow test case.
 */
export type WorkflowTestBody = (context: WorkflowTestContext, testInfo: TestInfo) => Promise<void>;

/**
 * A test case identified independently of its displayed title.
 */
export interface WorkflowTestCase {
    title: string;
    run: WorkflowTestBody;
    /** Skips this case with the given reason. */
    skip?: string;
}

export type WorkflowTestCases = Record<string, WorkflowTestCase>;

/**
 * Collection-time changes applied by an integration when a reusable suite is registered.
 */
export interface WorkflowSuiteOptions<T extends WorkflowTestCases> {
    /** Registers every case of the suite as skipped with this reason. */
    skip?: string;
    /** Per-case overrides: replace the title or body of a case, or skip it with a reason. */
    cases?: Partial<{ [K in keyof T]: Partial<WorkflowTestCase> }>;
}

export type WorkflowTestArguments = [
    title: string,
    details: TestDetails,
    body: (fixtures: WorkflowTestFixtures, testInfo: TestInfo) => Promise<void>
];

/**
 * Declaration helper returned by {@link workflowSuite} for one reusable suite.
 */
export interface WorkflowSuiteDeclaration<T extends WorkflowTestCases> {
    /**
     * Builds the declaration arguments for a case. Spread them into a `test` call so that
     * Playwright records the calling line as the declaration location of the case:
     * `test(...suite.args('caseId'))`.
     */
    args(id: keyof T & string): WorkflowTestArguments;
    /** Asserts at collection time that every case of the suite has been declared. */
    done(): void;
}

/**
 * Creates the declaration helper for a reusable suite. Call it inside the suite's
 * `test.describe` block.
 *
 * Titles, bodies and skips from `options.cases` are applied at collection time. Skipped cases
 * declare no fixtures, so integrations never start for them.
 *
 * @param test test instance whose integration should execute the suite
 * @param suite name of the suite, used in the completeness assertion of {@link WorkflowSuiteDeclaration.done}
 * @param cases default cases keyed by stable identifiers
 * @param options integration-specific case overrides and skips
 */
export function workflowSuite<T extends WorkflowTestCases>(
    test: WorkflowTest,
    suite: WorkflowSuiteName,
    cases: T,
    options: WorkflowSuiteOptions<T> = {}
): WorkflowSuiteDeclaration<T> {
    test.skip(options.skip !== undefined, options.skip);

    const declared = new Set<keyof T>();
    return {
        args(id) {
            declared.add(id);
            const testCase = cases[id];
            const override = options.cases?.[id];
            const title = override?.title ?? testCase.title;
            const skip = override?.skip ?? testCase.skip;

            if (skip !== undefined) {
                // Skipped at runtime rather than through `test.skip(title, details, body)`, because
                // that overload would have to be called from inside this helper, and Playwright
                // takes the declaration location from the first frame outside its own code — every
                // case would then report `suite.ts` instead of its own line. The body destructures
                // no fixtures and none are `auto`, so no integration starts for a skipped case, and
                // the annotation makes the reason visible during collection.
                // oxlint-disable-next-line no-empty-pattern
                const body = async ({}: WorkflowTestFixtures, testInfo: TestInfo): Promise<void> => testInfo.skip(true, skip);
                return [title, { annotation: { type: 'skip', description: skip } }, body];
            }

            const run = override?.run ?? testCase.run;
            const body = async ({ workflow }: WorkflowTestFixtures, testInfo: TestInfo): Promise<void> => run(workflow, testInfo);
            return [title, {}, body];
        },
        done() {
            const missing = Object.keys(cases).filter(id => !declared.has(id));
            if (missing.length > 0) {
                throw new Error(`The suite '${suite}' does not declare the following cases: ${missing.join(', ')}`);
            }
        }
    };
}
