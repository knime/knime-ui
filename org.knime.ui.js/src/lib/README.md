# `lib/` – Shared Libraries

## Why this folder exists

Historically, we accumulated a large collection of helpers inside `src/util`. Over time, this led to a few recurring problems:

- **Utility sprawl** – “Used in 2 places” became the only admission criteria, turning util into a dumping ground.
- **Low cohesion & unclear ownership** – Utilities were grouped arbitrarily rather than by domain responsibility.
- **Implicit coupling** – Helpers often introduced hidden dependencies across unrelated parts of the app.

To address this, we now follow a **lib-focused** approach.

---

## Mental Model: Think “Internal Third-Party Libraries”

Everything inside `lib/` should be treated as if it were a small, self-contained third-party library.

When creating or modifying something here, ask:

- Would I feel comfortable publishing this as an npm package?
- Is its responsibility clearly defined?
- Does it have a clean, minimal public API?
- Are its dependencies intentional and explicit?

If the answer to those questions is “no”, it likely doesn’t belong in `lib/`.

---

## What Belongs in `lib/`

A `lib` module should:

- Encapsulate a **clear, reusable behavior or domain concern**
- Have a **well-defined responsibility**
- Be **reusable across the app**
- Avoid leaking app-specific implementation details
- Minimize dependencies on unrelated parts of the codebase

### Examples

- A layout engine
- A coordinate transformation system
- A state synchronization mechanism
- A validation framework

### Non-examples

- A tiny function used twice but tightly coupled to a feature
- Glue code between two specific components
- One-off formatting helpers
- Feature-specific shortcuts

If it’s feature-scoped, it belongs in that feature — not in `lib`.
