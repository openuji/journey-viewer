# @journey-viewer/lint

A pure synchronous rule runner. The main entry point has no UJG imports or
default rules. Both entry points have no runtime dependencies.

```ts
import { lint } from "@journey-viewer/lint";
import { documentShape, referenceTargets, uniqueNodeIds } from "@journey-viewer/lint/ujg";

const value: unknown = JSON.parse(source);
const findings = lint(value, [documentShape, uniqueNodeIds, referenceTargets]);
```

Reading, native JSON syntax parsing, rule selection, and finding presentation are
separate caller operations. The application chooses severity and blocking policy;
the runner returns no validated document, boolean success flag, or rendered report.

## Runner contract

```ts
interface Finding {
  readonly ruleId: string;
  readonly path: readonly (string | number)[];
  readonly message: string;
}

type Rule<Value = unknown> = (value: Value) => readonly Finding[];

lint<Value>(value: Value, rules: readonly Rule<Value>[]): readonly Finding[];
```

Rules receive the original value and must not mutate it or maintain hidden state.
The runner concatenates their findings in supplied rule order and each rule's
finding order. An empty rule list returns no findings. There is no registration,
implicit checking, short-circuiting, sorting, filtering, or exception conversion.
An implementation error thrown by a custom rule propagates to the caller.

Paths locate properties and array positions in the original input. `[]` denotes
the input root. Rule IDs identify checks; callers can select which IDs block an
operation without changing rules or the runner. Custom rules can inspect any data
type, including future component fixtures, without importing the UJG rule entry.

## Initial UJG rules

Import these explicitly from `@journey-viewer/lint/ujg`. Each is a `Rule<unknown>`
and can run directly or through the runner, in any order.

| Export | Rule ID | Checks |
| --- | --- | --- |
| `documentShape` | `ujg/document-shape` | Supported compact document/node fields, required known-node fields and non-empty required reference lists, scalar/array element types, and object-shaped extension payloads |
| `uniqueNodeIds` | `ujg/unique-node-ids` | Repeated string `@id` values in the source `nodes` collection; reports each later occurrence |
| `referenceTargets` | `ujg/reference-targets` | Missing, ambiguous, or differently typed targets of supported Graph/Surface reference properties |

These checks follow the field and target-class definitions in the UJG Editor's
Draft [Core](https://ujg.specs.openuji.org/ed/core),
[Graph](https://ujg.specs.openuji.org/ed/graph), and
[Surface](https://ujg.specs.openuji.org/ed/surface) modules for the compact form
supported by Journey Viewer.

The rules inspect raw parsed data defensively; they do not call one another or
assume another rule has narrowed the input. Reference/identity checks skip fields
whose structural shape they cannot inspect. Shape findings are available when
the caller also supplies `documentShape`. Rule order establishes no prerequisites.

Target resolution uses exact identities in the supplied `nodes` array. No
contexts or imports are fetched, and prefixes/aliases are not expanded. A target
absent from this self-contained document is unresolved. Unknown module fields and
opaque payload contents are left alone. No nodes, refs, or input fields are fixed,
merged, removed, or converted into another representation.

This initial rule set does not check IRI grammar, context meaning, ownership,
transition locality, boundary mappings, forbidden properties, or outgoing-target
exclusivity. Those require additional independently supplied rules. No findings
means the selected checks found nothing; it is not a claim of full SHACL or UJG
conformance. The existing data-query package remains independent of these checks.

## Checks

`pnpm --filter @journey-viewer/lint test` builds public ESM/declarations, runs
compile-only readonly/API checks, and exercises custom injection, malformed data,
independent rules, precise locations, target classes, duplicate IDs, and frozen
OIDC data through the package's public exports. `pnpm test` also runs the unchanged
data-query and baseline suites.
