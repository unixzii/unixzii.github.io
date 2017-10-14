> This post is copied from [React](https://reactjs.org) official website to test my blog's stylesheet.

### New render return types: fragments and strings

You can now return an array of elements from a component’s `render` method. Like with other arrays, you’ll need to add a key to each element to avoid the key warning:

```
render() {
  // No need to wrap list items in an extra element!
  return [
    // Don't forget the keys :)
    <li key="A">First item</li>,
    <li key="B">Second item</li>,
    <li key="C">Third item</li>,
  ];
}
```

In the future, we’ll likely add a special fragment syntax to JSX that doesn’t require keys.

[See the full list of supported return types](#).

### Better error handling

Previously, runtime errors during rendering could put React in a broken state, producing cryptic error messages and requiring a page refresh to recover. To address this problem, React 16 uses a more resilient error-handling strategy. By default, if an error is thrown inside a component’s render or lifecycle methods, the whole component tree is unmounted from the root. This prevents the display of corrupted data. However, it’s probably not the ideal user experience.

Instead of unmounting the whole app every time there’s an error, you can use error boundaries. Error boundaries are special components that capture errors inside their subtree and display a fallback UI in its place. Think of error boundaries like try-catch statements, but for React components.

For more details, check out our [previous post on error handling in React 16](#).

### Reduced file size

Despite all these additions, React 16 is actually **smaller** compared to 15.6.1!

* `react` is 5.3 kb (2.2 kb gzipped), down from 20.7 kb (6.9 kb gzipped).
* `react-dom` is 103.7 kb (32.6 kb gzipped), down from 141 kb (42.9 kb gzipped).
* `react` + `react-dom` is 109 kb (34.8 kb gzipped), down from 161.7 kb (49.8 kb gzipped).

That amounts to a combined **32% size decrease compared to the previous version (30% post-gzip)**.

### New core architecture

React 16 is the first version of React built on top of a new core architecture, codenamed “Fiber.” You can read all about this project over on Facebook’s engineering blog. (Spoiler: we rewrote React!)

Fiber is responsible for most of the new features in React 16, like error boundaries and fragments. Over the next few releases, you can expect more new features as we begin to unlock the full potential of React.

Perhaps the most exciting area we’re working on is async rendering—a strategy for cooperatively scheduling rendering work by periodically yielding execution to the browser. The upshot is that, with async rendering, apps are more responsive because React avoids blocking the main thread.

This demo provides an early peek at the types of problems async rendering can solve:

> Ever wonder what "async rendering" means? Here's a demo of how to coordinate an async React tree with non-React work [https://t.co/3snoahB3uV](https://t.co/3snoahB3uV) [pic.twitter.com/egQ988gBjR](pic.twitter.com/egQ988gBjR)
>
> — Andrew Clark (@acdlite) September 18, 2017

*Tip: Pay attention to the spinning black square.*

We think async rendering is a big deal, and represents the future of React. To make migration to v16.0 as smooth as possible, we’re not enabling any async features yet, but we’re excited to start rolling them out in the coming months. Stay tuned!