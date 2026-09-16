# Extension

Extensions exist so that page objects and tests stay readable.

---

An Extension is a small reusable unit that adds functionality to a page object. It lets you add `click` support, for example, by reusing the default implementation the framework ships.

## Categories

We differentiate between Capabilities, Flows, and Models.

### Capability

Capabilities provide GLSP-Client-specific functionality like accessing the `command-palette` or `popup`. Complex interaction possibilities with GLSP are defined there.

### Flow

Flows define an action or sequence of actions the user would typically do, like `clicking`, `hovering`, or `renaming` an element.

- The `Click` flow consists of only a single action, namely clicking on an element.
- The `Rename` flow consists of actions like double-clicking on the element, writing the new name, and pressing enter.

### Model

Models add semantics to page objects. The framework sometimes needs more information from a page object than the DOM provides. `PLabelledElement`, for example, lets a page object declare the label of an element, and the graph can then search for elements by that label.

Capabilities and Flows usually ship a default implementation. Models often cannot, so you implement their interfaces directly.

## Mixin

Extensions build on [Mixins](https://www.typescriptlang.org/docs/handbook/mixins.html). Mixins define the class hierarchy of a page object at runtime, so a page object picks up only the functionality it needs and the prototype chain stays clean.

### Using extensions

```ts
const TaskManualMixin = Mix(PNode)
    .flow(useClickableFlow)
    .flow(useHoverableFlow)
    .flow(useDeletableFlow)
    .capability(useResizeHandleCapability)
    .capability(usePopupCapability)
    .capability(useCommandPaletteCapability)
    .build();
```

The code builds the class hierarchy of a page object from the bottom up. `PNode` is the root class. The flows add `Clickable`, `Hoverable` and `Deletable`, and the capabilities add `ResizeHandleCapability`, `PopupCapability` and `CommandPaletteCapability`.

The chain produces a new base class that carries all of that functionality, such as clicking, deleting and accessing the popup. `TaskManualMixin` is then the base for another mixin or for a page object.

```ts
export class TaskManual extends TaskManualMixin implements PLabelledElement {...}
```

Models do not always work like Capabilities and Flows. Here the page object implements `PLabelledElement` itself. `TaskManual` then fits anywhere a `PLabelledElement` is expected.

### Defining new Extensions

Capabilities and Flows have two parts, the `Extension-Declaration` and the `Extension-Provider`. Models usually have only the `Extension-Declaration`, because there is no default implementation to ship and you write it yourself.

#### Extension-Declaration

The `Extension-Declaration` interface defines the functionality the Extension wants to provide.

```ts
export interface PopupCapability<TPopup extends Popup = Popup> {
    popup(): TPopup;
    popupText(): Promise<string>;
}
```

The interface `PopupCapability` is the `Extension-Declaration` of the `Popup` capability. `popup()` returns the popup page object and `popupText()` returns its text.

```ts
export interface Clickable {
    click(): Promise<void>;
    dblclick(): Promise<void>;
}
```

The `Extension-Declaration` of the flow `Clickable` defines two methods that trigger different click actions.

The framework depends only on these interfaces. You can reuse the default implementation or write your own, and override or extend it where needed.

#### Extension-Provider

The `Extension-Provider` provides the default implementation for the specific `Extension-Declaration`.

```ts
export function usePopupCapability<TBase extends ConstructorA<Locateable & Hoverable>>(Base: TBase): Capability<TBase, PopupCapability> {
    abstract class Mixin extends Base implements PopupCapability {
        popup(): Popup {
            return new Popup(this);
        }

        async popupText(): Promise<string> {
            await this.hover();

            return this.popup().innerText();
        }
    }

    return Mixin;
}
```

The `Extension-Provider` is a function that returns the class implementing the `Extension-Declaration`. It takes a base class so that the prototype chain stays intact. You can constrain that base class, for example with `TBase extends ConstructorA<Locateable & Hoverable>`, and the compiler then rejects any base class that does not satisfy the constraint. The framework ships a default implementation, but you can write your own.

Because the `provider` and the `declaration` are separate, you can replace an implementation without reusing the default `provider`. Write a function that returns a class implementing the `Extension-Declaration` and respects the class hierarchy, then pass it to `Mix.flow` or `Mix.capability`.

You can also override only part of a default `provider`. A provider always returns a class, so you can use that class as the base:

```ts
export function useCustomPopupCapability<TBase extends ConstructorA<Locateable & Hoverable>>(
    Base: TBase
): Capability<TBase, PopupCapability> {
    abstract class Mixin extends usePopupCapability(Base) implements PopupCapability {
        override async popupText(): Promise<string> {
            await this.hover();

            return `Prefix: ${await this.popup().innerText()}`;
        }
    }

    return Mixin;
}

const CustomTaskManualMixin = Mix(PNode)
    .flow(useClickableFlow)
    .flow(useHoverableFlow)
    .flow(useDeletableFlow)
    .capability(useResizeHandleCapability)
    .capability(useCustomPopupCapability)
    .capability(useCommandPaletteCapability)
    .build();

// Or reuse
const CustomTaskManualMixin = Mix(TaskManualMixin).capability(useCustomPopupCapability).build();
```
