---
name: analyze-cheer-schedule-image
description: Analyze a CPBL cheerleader schedule image with team-specific visual rules and write a JSON export containing the date, canonical home-team code and name, and ordered home-member names. Use when a user provides a cheer schedule image plus a home-team name and asks to extract, transcribe, convert, export, or prepare cheerleader schedule data. The first supported image profile is Uni-Girls for the Uni-Lions.
---

# Analyze Cheer Schedule Image

Extract one game's home cheerleader schedule from an image and write a local
JSON export; never read from or write to Firebase.

## Workflow

1. Require an image and a user-provided home-team name. Ask for the missing
   input before continuing.
2. Find the repository root and read `src/data/defaultTeams.js`. Trim only
   surrounding whitespace from the supplied name, then look it up exactly in
   `TEAM_NAME_MAP`. Do not fuzzy-match or invent a team code.
3. If no mapping exists, list the accepted `TEAM_NAME_MAP` keys and ask the
   user which one applies. Do not inspect the schedule image yet.
4. Resolve `homeTeamName` from `TEAMS[homeTeam].name`. Never use the supplied
   alias as the canonical output name.
5. Select the reference matching the resolved team code. Read
   [references/uni-lions.md](references/uni-lions.md) for `T5`. For any other
   resolved team, explain that its image profile is not implemented and ask
   for a representative image plus a user-confirmed ordered member list.
6. Inspect the image at original detail when possible. Verify the team brand,
   extract the printed date, and transcribe member labels using the selected
   reference. Read labels; do not identify people from their faces.
7. Apply every validation rule below. When a readable label is absent from the
   selected profile's verified-name allowlist, ask the user to confirm its
   exact spelling. After confirmation, add it to that allowlist before
   producing JSON. For any other failed rule, do not create or modify an
   export file; state the uncertain field and candidates, then ask for
   confirmation.
8. When all checks pass, create `doc/exportCheerSchedule` under the repository
   root if it does not exist. Write the output contract below as UTF-8 JSON to
   `doc/exportCheerSchedule/{date}_{homeTeam}.json`, using two-space indentation
   and a final newline. Replace an existing file for the same date and team.
9. Return a concise confirmation with the created file path, followed by a
   fenced `json` code block containing the complete JSON exactly as written to
   the file. Do not summarize, truncate, or reorder the displayed content.

## Validation Rules

- Require a distinctive team text or logo marker; color alone is insufficient.
- Require one unambiguous full date containing year, month, and day.
- Normalize the date to `YYYY-MM-DD` and ignore every printed time.
- Preserve member order from top to bottom and left to right within each row.
- Require the number of readable member labels to match the visible portraits.
- Treat the verified-name allowlist only as a spelling-validation set. Never
  compare its total size with the number of labels or portraits in an image.
- Reject duplicate, unreadable, or unverified member names.
- Ignore opponents, matchup text, venue, game identifiers, and all Firebase
  metadata.

## File Contract

For example, write the `T5` schedule dated `2026-07-01` to
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
