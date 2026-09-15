# Playwright differences

This page lists where the GLSP-Playwright framework differs from plain Playwright.

---

## GLSPLocator

Playwright provides `Locator` for finding elements on the page. GLSP-Playwright wraps it in `GLSPLocator`. You use `GLSPLocator` to locate elements, and to switch from the GLSP-Playwright context back to the Playwright context.

## Locatable

`Locatable` is the root class for every page object. It provides the functionality all page objects need.
