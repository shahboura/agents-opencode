# Code Smells — the twelve baseline smells

Companion to `SKILL.md`. Load the entries that match what you found; you do not need
the whole list to name one smell.

**These are judgement calls, not lint rules.** A smell is a hint that reading or
changing this code costs more than it should. Name the smell, say what it costs, then
decide. If the repo has a documented standard that permits the pattern (a DI container
that justifies a middle man, a generated adapter layer, a deliberate public wrapper),
that standard overrides this baseline — cite it and move on.

## 1. Mysterious Name

**What it is:** A function, variable, or type whose name does not reveal what it does
or what it holds. `handleData`, `process2`, `tmp`, `Manager`, abbreviations only the
original author knows.

**Fix:** Rename to the domain word used by the people who own the feature. If no such
word exists, the naming problem is a design problem: split the thing until each part
can be named plainly.

## 2. Duplicated Code

**What it is:** The same logic in two or more places, so every change must be made
twice. Includes near-duplicates that differ by a flag or a field.

**Fix:** Extract the shared logic to one place and call it from both. If the copies are
diverging for good reason, make the difference a parameter. If they only look alike,
leave them separate — premature merging creates a worse coupling than the duplication.

## 3. Feature Envy

**What it is:** A function that reaches into another module's data more than it uses
its own. The behaviour lives far from the state it changes.

**Fix:** Move the method to the data it envies. If only part of it belongs there, move
that part and leave the rest.

## 4. Data Clumps

**What it is:** The same three or four values travel together through many signatures
(`host, port, user, password`; `street, city, postcode`). One of them is missing from a
call and nothing catches it.

**Fix:** Introduce a parameter object or a domain type and pass that. It also gives the
group a name and a place for validation.

## 5. Primitive Obsession

**What it is:** Primitives stand in for domain concepts that have rules — money as
`float`, email as `string`, IDs as bare integers, statuses as magic strings.

**Fix:** Introduce a value object that validates on construction and carries the
operations. Keep the primitive at the boundary (parsing, serialization) only.

## 6. Repeated Switches

**What it is:** The same `switch` or `if/else` chain on the same type code appears in
several places. Adding a case means editing all of them, and one will be missed.

**Fix:** Replace the chain with polymorphism or a lookup map keyed by the case, so
adding a case is one addition in one file.

## 7. Shotgun Surgery

**What it is:** One small logical change forces edits in many files. The responsibility
is scattered rather than concentrated.

**Fix:** Move the scattered pieces together — into one module, one function, or one
type. Then re-run the deletion test on what is left behind.

## 8. Divergent Change

**What it is:** One module changes for unrelated reasons: it handles parsing, pricing,
and email formatting, so three different teams keep editing it.

**Fix:** Split by reason to change, one module per axis. If the split produces
pass-through layers, prefer fewer, larger modules.

## 9. Speculative Generality

**What it is:** Abstraction built for a need that does not exist — unused parameters,
hooks with no caller, an interface with one implementation, a plugin point with no
plugins. The code is harder to read and costs more to change than the duplication it
was meant to prevent.

**Fix:** Delete it, or inline it until a real second caller exists. Let the abstraction
be introduced by the change that needs it, not in advance of it.

## 10. Message Chains

**What it is:** A caller navigates a long object graph: `a.getB().getC().getD().value()`.
Every hop couples the caller to a structure it does not own, and one changed link breaks
all callers.

**Fix:** Add a method on the first object that returns the value the caller wants, and
have callers use that. Hide the navigation.

## 11. Middle Man

**What it is:** A class or function whose methods mostly forward to another object. It
adds a file, a layer, and a place to look without adding behaviour.

**Fix:** Remove it and let callers talk to the target directly. Keep it only if it
enforces a rule, adapts a third-party API, or is one of two real implementations.

## 12. Refused Bequest

**What it is:** A subclass inherits methods or data it does not want — it overrides them
to throw, ignores them, or exposes them wrongly. The hierarchy claims an "is-a" that is
not true.

**Fix:** Replace inheritance with composition, or push the shared part down into a
sibling that actually uses it. If the base class exists only to share two fields, delete
the base class.

## Using the list

- Name at most three smells per finding; more usually means the module is too big to
  review and the first move is a split or a deletion.
- A smell with no cost attached ("this is duplication") is not a finding. State the
  cost: "change X must be made in four places; one will be missed".
- A documented repo standard that permits the smell overrides this baseline. Cite the
  standard, then drop the finding.
