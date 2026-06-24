---
name: analyze-cheer-schedule-image
description: Analyze CPBL cheerleader schedule images with team-specific visual rules and write JSON exports containing each date, canonical home-team code and name, and ordered home-member names. Use whenever a user provides one or more cheer schedule images plus a home-team name and asks to extract, transcribe, convert, export, or prepare cheerleader schedule data. Supports Uni-Girls for the Uni-Lions and Wing Stars for the TSG Hawks.
---

# Analyze Cheer Schedule Image

Extract one or more home cheerleader schedules from an image set and write
local JSON exports; never read from or write to Firebase.

## Workflow

1. Require at least one image and a user-provided home-team name. Ask for the
   missing input before continuing.
2. Find the repository root and read `src/data/defaultTeams.js`. Trim only
   surrounding whitespace from the supplied name, then look it up exactly in
   `TEAM_NAME_MAP`. Do not fuzzy-match or invent a team code.
3. If no mapping exists, list the accepted `TEAM_NAME_MAP` keys and ask the
   user which one applies. Do not inspect the schedule image yet.
4. Resolve `homeTeamName` from `TEAMS[homeTeam].name`. Never use the supplied
   alias as the canonical output name.
5. Select and read only the reference matching the resolved team code:
   [references/uni-lions.md](references/uni-lions.md) for `T5` or
   [references/tsg-hawks.md](references/tsg-hawks.md) for `T6`. For any other
   resolved team, explain that its image profile is not implemented and ask
   for representative images plus a user-confirmed ordered member list.
6. Inspect every supplied image at original detail when possible. Verify the
   team brand, extract the schedule dates, and transcribe member labels using
   the selected reference. Read labels; do not identify people from faces.
7. Apply every validation rule below. When a readable label is absent from the
   selected profile's verified-name allowlist, ask the user to confirm its
   exact spelling. After confirmation, add it to that allowlist before
   producing JSON. If a profile requires a target date or year that is absent
   from the artwork, ask for it; never derive it from filenames, directory
   names, post timestamps, or filesystem metadata. For any other failed rule,
   do not create or modify an export file; state the uncertain field and
   candidates, then ask for confirmation.
8. When all checks pass, create `doc/exportCheerSchedule` under the repository
   root if it does not exist. For every requested schedule date, write the
   output contract below as UTF-8 JSON to
   `doc/exportCheerSchedule/{date}_{homeTeam}.json`, using two-space indentation
   and a final newline. Replace an existing file for the same date and team.
9. Return a concise confirmation listing every created file path. Follow each
   path with a fenced `json` code block containing that file's complete JSON
   exactly as written. Do not summarize, truncate, combine, or reorder files.

## Validation Rules

- Require a distinctive team text or logo marker; color alone is insufficient.
- Require one unambiguous month and day per exported schedule. Require the year
  from either the artwork or explicit user input.
- Normalize each date to `YYYY-MM-DD` and ignore every printed time.
- Preserve member order from top to bottom and left to right within each row.
- Require the number of readable member labels to match the visible portraits.
- Treat the verified-name allowlist only as a spelling-validation set. Never
  compare its total size with the number of labels or portraits in an image.
- Reject duplicate, unreadable, or unverified member names.
- Ignore opponents, matchup text, venue, game identifiers, and all Firebase
  metadata.

## File Contract

For example, write a `T5` schedule dated `2026-07-01` to
`doc/exportCheerSchedule/2026-07-01_T5.json` with only these fields:

```json
{
  "date": "YYYY-MM-DD",
  "homeTeam": "resolved TEAM_NAME_MAP code",
  "homeTeamName": "resolved TEAMS name",
  "homeMembers": ["ordered", "verified", "names"]
}
```

Never include `time`, `awayTeam`, `awayMembers`, `gameId`, `fetchedDate`, a
Firebase path, confidence scores, or inferred data not printed in the image.
