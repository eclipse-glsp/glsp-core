# Metadata

The GLSP-Client-Graph adds a `type` attribute and further metadata such as `sourceId` to every graph element in the DOM. Third-party applications read those attributes to understand the structure behind an SVG element.

```html
<g id="sprotty_task0" data-svg-metadata-type="task:manual" data-svg-metadata-parent-id="sprotty_sprotty" ...>
    ...
    <g ... data-svg-metadata-type="icon" data-svg-metadata-parent-id="sprotty_task0" ...>...</g>
    ...
    <text ... data-svg-metadata-type="label:heading" data-svg-metadata-parent-id="sprotty_task0" ...>...</text>
    ...
</g>
```

Connecting a page object to the right SVG element takes the `type` in addition to the selector. Without it, a page object can be mapped onto the wrong graph element.

---

Decorators keep this declaration short:

- <https://www.typescriptlang.org/docs/handbook/decorators.html>
- <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators>

## Decorators

Every graph element, such as a node or an edge, uses the matching decorator: `NodeMetadata`, `EdgeMetadata` or `ModelElementMetadata`. The decorator stores the metadata alongside the page object.

```ts
@NodeMetadata({
    type: 'task:manual'
})
export class TaskManual extends TaskManualMixin implements PLabelledElement { ... }
```

The `type` field of `NodeMetadata` holds the `type` that the GLSP-Client-Graph writes into the SVG. With it, the framework compares the page object's `type`, `task:manual` here, against the `type` in the GLSP-Client DOM and checks that the page object can handle the element before it touches the DOM.

### Reading the metadata

The `PMetadata` namespace provides functionality for reading and writing the metadata of the page objects.
