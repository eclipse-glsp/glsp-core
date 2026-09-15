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
import type { Locator } from '@playwright/test';
import { waitForFunction } from '../../../integration/wait.fixes';
import type { GLSPLocator } from '../../../remote';
import { Input, Locateable } from '../../../remote';

export interface GLSPBaseCommandPaletteOptions {
    locator: GLSPLocator;
    suggestionLocator?: GLSPLocator;
    loadingLocator?: GLSPLocator;
}

export abstract class GLSPBaseCommandPalette extends Locateable {
    readonly input;
    readonly suggestionLocator;
    readonly loadingLocator;

    protected readonly keyboard;

    constructor(protected readonly options: GLSPBaseCommandPaletteOptions) {
        super(options.locator);
        this.suggestionLocator = options.suggestionLocator ?? this.locator.child('.command-palette-suggestions');
        this.loadingLocator = options.loadingLocator ?? this.locator.child('.loading');

        this.keyboard = this.app.page.keyboard;
        this.input = new Input(this.locator.child('input'));
    }

    abstract open(): Promise<void>;

    async search(text: string, options?: { confirm?: boolean }): Promise<void> {
        const suggestions = await this.suggestions();
        await this.input.type(text, { delay: 50 });
        await this.waitForLoadingDetached();
        await this.waitForSuggestionsChange(suggestions);

        if (options?.confirm) {
            await this.input.press('Enter');
            await this.waitForHidden();
        }
    }

    async confirm(suggestion: string): Promise<void> {
        await this.suggestionLocator.locate().locator(`text=${suggestion}`).click();
        await this.waitForHidden();
    }

    async suggestions(): Promise<string[]> {
        await this.waitForLoadingDetached();
        await this.waitForSuggestionsChange();

        return this.suggestionLocator.locate().locator('> *').evaluateAll(this.retrieveSuggestionsTextPageFunction);
    }

    async cancel(): Promise<void> {
        await this.keyboard.press('Escape');
        await this.waitForHidden();
    }

    protected async retrieveSuggestionsTextPageFunction(elements: (SVGElement | HTMLElement)[]): Promise<string[]> {
        return elements.map(element => {
            const content = element.textContent;
            if (content) {
                // Whitespaces from the received text content might be encoded (&nbsp;)
                // and need to be replaced with a standard whitespace
                return content.replace(/\s+/g, ' ');
            }
            return '';
        });
    }

    protected async selectedSuggestion(): Promise<Locator> {
        const locator = this.suggestionLocator.locate().locator('.selected');
        await locator.waitFor();
        return locator;
    }

    protected async waitForLoadingAttached(): Promise<void> {
        await this.loadingLocator.locate().waitFor({ state: 'attached' });
    }

    protected async waitForLoadingDetached(): Promise<void> {
        await this.loadingLocator.locate().waitFor({ state: 'detached' });
    }

    protected async waitForSuggestionsChange(suggestionsBefore: string[] = []): Promise<void> {
        const element = await this.suggestionLocator.locate().elementHandle();

        await waitForFunction(async () => {
            const length = (await element?.evaluate(e => e.children.length)) ?? 0;
            return length !== suggestionsBefore.length;
        });
    }
}
