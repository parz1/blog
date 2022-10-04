---
title: Object.assign
---

> The **`Object.assign()`** method copies all [enumerable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/propertyIsEnumerable) [own properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty) from one or more _source objects_ to a _target object_. It returns the target object.
>
> from [mdn.io/Object.assign()](https://developer.mozilla.org/en-us/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)

```javascript
const target = { a: 1, b: 2 }
const source = { b: 4, c: 5 }

const returnedTarget = Object.assign(target, source)

console.log(target)
// expected output: Object { a: 1, b: 4, c: 5 }

console.log(returnedTarget)
// expected output: Object { a: 1, b: 4, c: 5 }
```

使用方式：**Object.assign(target, ...sources)**

1. target 对象里的属性会被 source 对象们里的同名属性覆盖，顺序是后覆盖前。
2.
