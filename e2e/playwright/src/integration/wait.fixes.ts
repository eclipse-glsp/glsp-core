/********************************************************************************
 * Copyright (c) 2023-2026 Business Informatics Group (TU Wien) and others.
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

export interface WaitFunctionOptions {
    /**
     * Interval for rechecking the remote browser
     */
    pollInterval: number;
}

/**
 * Workaround because of iframes - iframes do not really work well with {@link page.waitForFunction}
 *
 * @param cb The callback which provides the check condition
 * @param options Options for waiting
 */
export async function waitForFunction(cb: () => Promise<boolean>, options: WaitFunctionOptions = { pollInterval: 100 }): Promise<void> {
    let finished = await cb();

    while (!finished) {
        await new Promise(res => setTimeout(() => res(''), options.pollInterval));
        finished = await cb();
    }
}
