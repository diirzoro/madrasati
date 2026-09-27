# Madrasati media architecture

**ONE ENTITY = ONE MEDIA ROOT. DATABASE ID = MEDIA OWNER. NAME = LABEL ONLY.**

The database id is the only identity that owns media. A name, slug, label or
filename is never the identity — because names can be duplicated, changed,
misspelled, or expressed in two languages. Two entities named "مدرسة النور" own
two different roots because their ids differ.

## Identity → root

| Entity | Identity | Root |
|---|---|---|
| Organization | `organizations.id` | `assets/institutions/<type-folder>/<id>[-label]/` |
| Teacher | `teacher_profiles.id` | `assets/teachers/<gender>/<id>[-label]/` |
| User | `users.id` | `assets/users/<id>/` |
| Owner | `users.id` | `assets/owners/<id>/` |

- `<type-folder>`: `private-schools` · `government-schools` · `institutes` ·
  `colleges` · `universities`.
- `<gender>`: `male` · `female` (organizational category only — **never** the identity).
- `<id>[-label]`: the id is mandatory and first; the slug is an optional readable
  suffix. `125` or `125-noor-school` — either way `125` is authoritative.

## Media categories

```
organization: logo · cover · gallery · facilities · documents
teacher:      profile · cover · gallery · documents
user:         avatar · documents
owner:        profile · documents
```

## Resolution priority (never reversed, never random)

1. **Entity-owned media from the API/database** — `o.image`, `o.gallery`, `t.avatarUrl`.
2. **Explicit id → existing-asset mapping** — `media-map.js`, built from the DB by
   `scripts/media-map-build.js`.
3. **The entity upload root** — created by `scripts/media-init.js`.
4. **Generic reference fallback** — `assets/reference/**`, chosen deterministically
   by the entity id (`hash(id)`), flagged `generic:true`, and never presented as the
   real photo of a named entity.

## Existing-asset mapping

Seeded logos live at `assets/logos/<slug>.svg` and are referenced by
`organizations.image`. They are **preserved in place** (not copied) and mapped to
their organization id in `media-map.js`. Re-run `node scripts/media-map-build.js`
after seeding to refresh the mapping.

## Upload rules (security / isolation)

An upload must provide `entity_type` + `entity_id` + `media_type`. The destination
is derived only from those — never from a frontend-supplied path:

```js
MadrasatiMedia.resolvePath({ entityType:'organization', entityId:'…', mediaType:'cover', orgType:'private_school', label:'noor-school' });
// -> assets/institutions/private-schools/<id>-noor-school/cover/
```

```bash
node scripts/media-init.js org <organization-id> <slug> <type>
node scripts/media-init.js teacher <teacher-id> <slug> male|female
node scripts/media-init.js user <user-id>
node scripts/media-init.js owner <owner-id>
```

## Duplicate names / renames

- Same name, different ids → different roots. No mixing is possible.
- A rename changes the display label only; the media root keeps the id and is
  unchanged. The optional label suffix may be updated without moving files (or the
  root keeps its original label — ownership is unaffected).

## Generic vs real

`assets/reference/**` is **fallback only** and is never auto-assigned as a named
entity's real media. Real entity media always wins.
