---
description: >-
  Learn how to work with slots to work with the concept of dynamic slot
  placeholders in your custom elements.
---

# Slotted content

In Aurelia, we have several ways to project content into custom elements. In the case of Shadow DOM, we can use `<slot>` and for situations where Shadow DOM is disabled, but we want content project functionality, we have `<au-slot>`

## Slot

When working with Shadow DOM-enabled components, the `<slot>` element is a native way to allow content projection into components. In some instances, the `<slot>` element will not be the right choice, and you will need to consider `<au-slot>` (referenced below) instead.

{% hint style="warning" %}
The slot element will only work when Shadow DOM is enabled for your component. Attempting to use the slot element with it disabled will throw an error in the console.
{% endhint %}

In the case of a fictional but realistic example, we have a modal element. The user can provide content which is rendered inside of the element.

```html
<div class="modal">
    <div class="modal-inner">
        <slot></slot>
    </div>
</div>
```

Assuming this is a Shadow DOM-enabled component, all is well. We have a custom element that allows for content to be used inside of it.

Because we named our component `au-modal` we will then use it like this:

```html
<au-modal>
    <div slot>
        <p>Modal content inside of the modal</p>
    </div>
</au-modal>
```

Notice how we use the attribute `slot` on our content being passed in? This tells Aurelia to project our content into the default slot. Custom elements can have multiple slots, so how do we tell Aurelia where to project our content?

### Named slots

A named slot is no different to a conventional slot. The only difference is the slot has a name we can reference. A slot without a name gets the name `default` by default.

```html
<div class="modal">
    <div class="modal-inner">
        <slot name="content"></slot>
    </div>
</div>
```

Now, to use our element with a named slot, you can do this:

```html
<au-modal>
    <div slot="name">
        <p>Modal content inside of the modal</p>
    </div>
</au-modal>
```

### Fallback content

A slot can display default content when nothing is explicitly projected into it. Fallback content works for default and named slot elements.

```html
<div class="modal">
    <button type="button" data-action="close" class="close" aria-label="Close" click.trigger="close()" ><span aria-hidden="true">&times;</span></button>
    <div class="modal-inner">
        <slot>This is the default content shown if the user does not supply anything.</slot>
    </div>
</div>
```

## Au-slot

Aurelia provides another way of content projection with `au-slot`. This is similar to the native `slot` when working with content projection. However, it does not use Shadow DOM. `au-slot` is useful where you want externally defined styles to penetrate the component boundary, facilitating easy styling of components.

Suppose you create your own set of custom elements solely used in your application. In that case, you might want to avoid the native slots in the custom elements, as it might be difficult to style them from your application.

However, if you still want slot-like behavior, then you can use `au-slot`, as that makes styling those custom elements/components easier. Instead of using shadow DOM, the resulting view is composed purely by the Aurelia compilation pipeline.&#x20;

There are other aspects of `au-slot` as well which will be explored in this section with examples.

{% hint style="info" %}
An obvious question might be, "Why not simply 'turn off' shadow DOM, and use the `slot` itself"? We feel that goes opposite to Aurelia's promise of keeping things as close to native behavior as possible. Moreover, using a different name like `au-slot` makes it clear that the native slot is not used in this case. However, still brings slotting behavior to use.
{% endhint %}

{% hint style="info" %}
If you have used the `replaceable` and `replace part` before or with Aurelia1, it is replaced with `au-slot`.
{% endhint %}

## Basic templating usage

Like `slot`, a "projection target"/"slot" can be defined using a `<au-slot>` element, and a projection to that slot can be provided using a `[au-slot]` attribute. Consider the following example.

{% code title="my-element.html" %}
```html
static content
<au-slot>fallback content for default slot.</au-slot>
<au-slot name="s1">fallback content for s1 slot.</au-slot>
```
{% endcode %}

{% code title="my-app.html" %}
```markup
<!-- Usage without projection -->
<my-element></my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    static content
    fallback content for default slot.
    fallback content for s1 slot.
  </my-element>
-->

<!-- Usage with projection -->
<my-element>
  <div>d</div>        <!-- using `au-slot="default"` explicitly also works. -->
  <div au-slot="s1">p1</div>
</my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    static content
    <div>d</div>
    <div>p1</div>
  </my-element>
-->

<my-element>
  <template au-slot="s1">p1</template>
</my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    static content
    fallback content for default slot.
    p1
  </my-element>
-->
```
{% endcode %}

In the example above, the `my-element` custom element defines two slots: one default and one named. The slots can optionally have fallback content; i.e. when no projection is provided for the slot, the fallback content will be displayed. Projecting to a slot is, therefore, also optional. However, when a projection is provided for a slot, that overrides the fallback content of that slot.

Similar to native shadow DOM and `<slot/>`/`[slot]` pair, `[au-slot]` attribute is not mandatory if you are targeting the default slot. All content without explicit `[au-slot]` is treated as targeting the default slot. Having no `[au-slot]` is also equal to having explicit `au-slot` on the content:

{% code title="my-app.html" %}
```markup
<template as-custom-element="my-element">
  <au-slot>dfb</au-slot>
</template>


<my-element><div au-slot>projection</div></my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    <div>projection</div>
  </my-element>
-->
```
{% endcode %}

Another important point to note is that the usage of `[au-slot]` attribute is supported only on the direct children elements of a custom element. This means that the following examples do not work.

{% code title="my-app.html" %}
```markup
<!-- Do NOT work. -->

<div au-slot></div>

<template><div au-slot></div></template>

<my-element>
  <div>
    <div au-slot></div>
  </div>
<my-element>
```
{% endcode %}

**Inject the projected slot information**

It is possible to inject an instance of `IAuSlotsInfo` in a custom element view model. This provides information related to the slots inside a custom element. The information includes only the slot names for which content has been projected. Let's consider the following example.

{% tabs %}
{% tab title="my-element.html" %}
```markup
<au-slot>dfb</au-slot>
<au-slot name="s1">s1fb</au-slot>
<au-slot name="s2">s2fb</au-slot>
```
{% endtab %}

{% tab title="my-element.ts" %}
```typescript
import { IAuSlotsInfo } from '@aurelia/runtime-html';

class MyElement {
  public constructor(
    @IAuSlotsInfo public readonly slotInfo: IAuSlotsInfo,
  ) {
    console.log(slotInfo.projectedSlots);
  }
}
```
{% endtab %}

{% tab title="my-app.html" %}
```markup
<!-- my_element_instance_1 -->
<my-element>
  <div au-slot="default">dp</div>
  <div au-slot="s1">s1p</div>
</my-element>
<!-- my_element_instance_2 -->
<my-element></my-element>
```
{% endtab %}
{% endtabs %}

The followingrk would be logged to the console for the instances of `my-element`.

```markup
// my_element_instance_1
['default', 's1']

// my_element_instance_2
[]
```

## Binding scope

It is also possible to use data-binding, interpolation etc., while projecting. While doing so, the scope accessing rule can be described by the following thumb rule:

1. When the projection is provided, the scope of the custom element providing the projection is used.
2. When the projection is not provided, the scope of the inner custom element is used.
3. The outer custom element can still access the inner scope using the `$host` keyword while projecting.

### Examples

To further explain how these rules apply, these rules are explained with the following examples.

#### Projection uses the outer scope by defaultthe&#x20;

Let's consider the following example with interpolation.

{% tabs %}
{% tab title="my-app.html" %}
```markup
<my-element>
  <div au-slot="s1">${message}</div>
</my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    <div>outer</div>
  </my-element>
-->
```
{% endtab %}

{% tab title="my-app.ts" %}
```typescript
export class MyApp {
  public readonly message: string = 'outer';
}
```
{% endtab %}

{% tab title="my-element.html" %}
```markup
<au-slot name="s1">${message}</au-slot>
```
{% endtab %}

{% tab title="my-element.ts" %}
```typescript
export class MyElement {
  public readonly message: string = 'inner';
}
```
{% endtab %}
{% endtabs %}

Although the `my-element` has a `message` property, but as `my-app` projects to `s1` slot, scope of `my-app` is used to evaluate the interpolation expression. Similar behavior can also be observed when binding properties of custom elements, as shown in the following example.

{% tabs %}
{% tab title="my-app.html" %}
```markup
<my-element>
  <foo-bar au-slot="s1" foo.bind="message"></foo-bar>
</my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    <foo-bar>outer</foo-bar>
  </my-element>
-->
```
{% endtab %}

{% tab title="my-app.ts" %}
```typescript
export class MyApp {
  public readonly message: string = 'outer';
}
```
{% endtab %}

{% tab title="my-element.html" %}
```markup
<au-slot name="s1">${message}</au-slot>
```
{% endtab %}

{% tab title="my-element.ts" %}
```typescript
export class MyElement {
  public readonly message: string = 'inner';
}
```
{% endtab %}

{% tab title="foo-bar.html" %}
```markup
${foo}
```
{% endtab %}

{% tab title="foo-bar.ts" %}
```typescript
export class FooBar {
  @bindable public foo: string;
}
```
{% endtab %}
{% endtabs %}

#### **Fallback uses the inner scope by default**

Let's consider the following example with interpolation. This is the same example as before, but this time without projection.

{% tabs %}
{% tab title="my-app.html" %}
```markup
<my-element></my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    inner
  </my-element>
-->
```
{% endtab %}

{% tab title="my-app.ts" %}
```typescript
export class MyApp {
  public readonly message: string = 'outer';
}
```
{% endtab %}

{% tab title="my-element.html" %}
```markup
<au-slot name="s1">${message}</au-slot>
```
{% endtab %}

{% tab title="my-element.ts" %}
```typescript
export class MyElement {
  public readonly message: string = 'inner';
}
```
{% endtab %}
{% endtabs %}

Note that in the absence of projection, the fallback content uses the scope of `my-element`. For completeness, the following example shows that it also holds while binding values to the `@bindable`s in custom elements.

{% tabs %}
{% tab title="my-app.html" %}
```markup
<my-element></my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    <foo-bar>inner</foo-bar>
  </my-element>
-->
```
{% endtab %}

{% tab title="my-app.ts" %}
```typescript
export class MyApp {
  public readonly message: string = 'outer';
}
```
{% endtab %}

{% tab title="my-element.html" %}
```markup
<au-slot name="s1">
  <foo-bar foo.bind="message"></foo-bar>
</au-slot>
```
{% endtab %}

{% tab title="my-element.ts" %}
```typescript
export class MyElement {
  public readonly message: string = 'inner';
}
```
{% endtab %}

{% tab title="foo-bar.html" %}
```markup
${foo}
```
{% endtab %}

{% tab title="foo-bar.ts" %}
```typescript
export class FooBar {
  @bindable public foo: string;
}
```
{% endtab %}
{% endtabs %}

#### **Access the inner scope with `$host`**

The outer custom element can access the inner custom element's scope using the `$host` keyword, as shown in the following example.

{% tabs %}
{% tab title="my-app.html" %}
```markup
<my-element>
  <div au-slot="s1">${$host.message}</div>
  <div au-slot="s2">${message}</div>
</my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    <div>inner</div>
    <div>outer</div>
  </my-element>
-->
```
{% endtab %}

{% tab title="my-app.ts" %}
```typescript
export class MyApp {
  public readonly message: string = 'outer';
}
```
{% endtab %}

{% tab title="my-element.html" %}
```markup
<au-slot name="s1"></au-slot>
<au-slot name="s2"></au-slot>
```
{% endtab %}

{% tab title="my-element.ts" %}
```typescript
export class MyElement {
  public readonly message: string = 'inner';
}
```
{% endtab %}
{% endtabs %}

Note that using the `$host.message` expression, `MyApp` can access the `MyElement#message`. The following example demonstrates the same behavior for binding values to custom elements.

{% tabs %}
{% tab title="my-app.html" %}
```markup
<my-element>
  <foo-bar au-slot="s1" foo.bind="$host.message"></foo-bar>
</my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    <foo-bar>inner</foo-bar>
  </my-element>
-->
```
{% endtab %}

{% tab title="my-app.ts" %}
```typescript
export class MyApp {
  public readonly message: string = 'outer';
}
```
{% endtab %}

{% tab title="my-element.html" %}
```markup
<au-slot name="s1"></au-slot>
```
{% endtab %}

{% tab title="my-element.ts" %}
```typescript
export class MyElement {
  public readonly message: string = 'inner';
}
```
{% endtab %}

{% tab title="foo-bar.html" %}
```markup
${foo}
```
{% endtab %}

{% tab title="foo-bar.ts" %}
```typescript
export class FooBar {
  @bindable public foo: string;
}
```
{% endtab %}
{% endtabs %}

Let's consider another example of `$host` which highlights the communication between the inside and outside of a custom element that employs `<au-slot>`

{% tabs %}
{% tab title="my-app.html" %}
```markup
<template as-custom-element="my-element">
  <bindable property="people"></bindable>
  <au-slot name="grid">
    <au-slot name="header">
      <h4>First Name</h4>
      <h4>Last Name</h4>
    </au-slot>
    <template repeat.for="person of people">
      <au-slot name="content" expose.bind="{ person, $event, $odd, $index }">
        <div>${person.firstName}</div>
        <div>${person.lastName}</div>
      </au-slot>
    </template>
  </au-slot>
</template>

<my-element people.bind="people">
  <template au-slot="header">
    <h4>Meta</h4>
    <h4>Surname</h4>
    <h4>Given name</h4>
  </template>
  <template au-slot="content">
    <div>${$host.$index}-${$host.$even}-${$host.$odd}</div>
    <div>${$host.person.lastName}</div>
    <div>${$host.person.firstName}</div>
  </template>
</my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    <h4>Meta</h4>           <h4>Surname</h4>      <h4>Given name</h4>

    <div>0-true-false</div> <div>Doe</div>        <div>John</div>
    <div>1-false-true</div> <div>Mustermann</div> <div>Max</div>
  </my-element>
-->
```
{% endtab %}

{% tab title="my-app.ts" %}
```typescript
export class MyApp {
  public readonly people: Person[] = [
    new Person('John', 'Doe'),
    new Person('Max', 'Mustermann'),
  ];
}

class Person {
  public constructor(
    public firstName: string,
    public lastName: string,
  ) { }
}
```
{% endtab %}
{% endtabs %}

In the example above, we replace the 'content' template of the grid, defined in `my-element`, from `my-app`. While doing so, we can grab the scope of the `<au-slot name="content" />` and use the properties made available by the binding `expose.bind="{ person, $even, $odd, $index }"`, and use those in the projection template.&#x20;

Note that `$host` allows us to access whatever the `<au-slot/>` element exposes, and this value can be changed to enable powerful scenarios. Without the `$host` it might not have been easy to provide a template for the repeater from the outside.

{% hint style="info" %}
The last example is also interesting from another aspect. It shows that many parts of the grid can be replaced with projection while working with a grid. This includes the header of the grid (`au-slot="header"`), the template column of the grid (`au-slot="content"`), or even the whole grid itself (`au-slot="grid"`).
{% endhint %}

{% hint style="warning" %}
The `$host` keyword can only be used in the context of projection. Using it in any other context is not supported and will throw errors with high probability.
{% endhint %}

## Multiple projections for a single slot

It is possible to provide multiple projections to a single slot.

{% code title="my-element.html" %}
```html
<au-slot name="s1">s1</au-slot>
<au-slot name="s2">s2</au-slot>
```
{% endcode %}

{% code title="my-app.html" %}
```markup
<my-element>
  <div au-slot="s2">p20</div>
  <div au-slot="s1">p11</div>
  <div au-slot="s2">p21</div>
  <div au-slot="s1">p12</div>
</my-element>
<!-- Rendered (simplified): -->
<!--
  <my-element>
    <div>p11</div>
    <div>p12</div>

    <div>p20</div>
    <div>p21</div>
  </my-element>
-->
```
{% endcode %}

This is useful for many cases. One evident example would a 'tabs' custom element.

{% code title="my-element.html" %}
```html
<au-slot name="header"></au-slot>
<au-slot name="content"></au-slot>
```
{% endcode %}

{% code title="my-app.html" %}
```markup
<my-tabs>
  <h3 au-slot="header">Tab1</h3>
  <div au-slot="content">Tab1 content</div>

  <h3 au-slot="header">Tab2</h3>
  <div au-slot="content">Tab2 content</div>

  <!--...-->
</my-tabs>
```
{% endcode %}

This helps keep things closer that belong together. For example, keeping the tab-header and tab-content next to each other provides better readability and understanding of the code to the developer. On other hand, it still places the projected contents in the right slot.

## Duplicate slots

Having more than one `<au-slot>` with the same name is also supported. This lets us project the same content to multiple slots declaratively, as can be seen in the following example.

{% code title="person-card.html" %}
```html
<let details-shown.bind="false"></let>
<au-slot name="name"></au-slot>
<button click.delegate="detailsShown=!detailsShown">Toggle details</button>
<div if.bind="detailsShown">
  <au-slot name="name"></au-slot>
  <au-slot name="role"></au-slot>
  <au-slot name="details"></au-slot>
</div>
```
{% endcode %}

{% code title="my-app.html" %}
```markup
<person-card>
  <span au-slot="name"> John Doe </span>
  <span au-slot="role"> Role1 </span>
  <span au-slot="details"> Lorem ipsum </span>
</person-card>
```
{% endcode %}

Note that projection for the name is provided once, but it gets duplicated in 2 slots. You can also see this example in action [here](https://stackblitz.com/edit/au-slot-duplicate-slots?file=my-app.html).
