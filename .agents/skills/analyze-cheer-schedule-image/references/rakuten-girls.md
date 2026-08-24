# Rakuten Girls Image Profile

Use this profile only after `src/data/defaultTeams.js` resolves the supplied
home-team name to `T3`.

## Brand Validation

Require at least one distinctive visible marker:

- `Rakuten Girls`
- `Rakuten Monkeys` in the copyright notice
- Rakuten Girls ribbon / logo

## Matrix Layout

- Treat all supplied slides with the same title, row dates, styling, month, and
  disclaimer as one horizontal matrix split into member-column groups.
- Require every slide in the carousel or image set before exporting a row. If
  navigation dots, arrows, or a visibly clipped continuation indicate missing
  slides, ask for the missing slides.
- Read member headers from left to right on each slide and preserve slide order.
- Treat each date at the left as a schedule row (formatted as `M.D WEEKDAY TIME`).
- A pink or purple heart icon at a member-column and date-row intersection means
  that member is scheduled. An empty cell means that member is absent.
- For each date, concatenate the heart-marked member names from left to right
  across slides in their supplied carousel order.
- Reject a slide set when row dates do not align exactly, because it may mix
  different months or revisions.
- Ignore portraits when deciding attendance; only the printed header labels and
  row heart icons carry schedule data.

## Date Rules

The reviewed matrix prints `M.D` and the year `YYYY` (e.g. `2026 Rakuten Girls Schedule`).
If the year is present in the artwork, use it; otherwise require the year from
explicit user input before writing JSON. Never infer it from screenshot names,
post dates, folder names, file timestamps, or the current date.

If the user requests one date, export only that row. If the user requests the
whole image set or does not narrow the request, export every visible date after
the year is confirmed.

## Verified Member Names

Accept only these labels transcribed from the reviewed Rakuten Girls matrix and
cross-referenced with the Firebase database, preserving spelling and
capitalization:

- 穆又甯
- 宋宋
- 筠熹
- 貝佳頤
- 高橋佳帆
- 卉妮
- 林穎樂
- 孟潔
- 笑笑
- 熊霓
- Kira
- 蜜卡登
- 河智媛
- 廉世彬
- 禹洙漢
- 高佳彬
- 若潼
- 言梓璇
- 金佳垠
- 禹菡
- 岱縈
- 崔荷潾
- 曲曲
- 彭彭
- 沈珈妤
- 溫妮
- 琳妲

Treat this list only as a spelling-validation set. Its size does not determine
attendance for any date. When a new or unclear label appears, ask the user for
the exact spelling, add the confirmed spelling here, and only then export JSON.

## Reviewed Sample Shape

The reviewed September 2026 matrix consists of four slides, six to seven member
columns per slide (total 27 members), and rows for `9.2`, `9.3`, `9.8`, `9.9`,
`9.11`, `9.12`, `9.13`, `9.19`, `9.20`, `9.22`, `9.24`, `9.25`, and `9.28`.
These values describe that sample only. Never require future Rakuten Girls
schedules to have the same slide, column, or row counts.
