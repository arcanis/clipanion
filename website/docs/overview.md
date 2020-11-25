---
id: overview
title: Overview
slug: /
---

The idea behind Clipanion is to provide a CLI framework that won't make you hate CLIs. In particular, it means that Clipanion wants to be:

- **Correct**, with consistent and predictable behaviors regardless of your option definitions.
- **Full-featured**, with no need to write custom code to support for specific CLI patterns.
- **Type-safe**, with no risks that your application will silently rely on out-of-sync options.

It also has a few non-goals:

- We don't care about being **modular**. Given that we intend to be full-featured, it doesn't make sense to publish things under different package names. Clipanion will always be available as just `clipanion`.

- We won't provide **domain-specific languages (DSL)**. Once upon a time Clipanion actually worked like this, using a "natural" language to declare commands, but over time it became clear that we were merely fighting JavaScript, losing many useful tooling integrations.
