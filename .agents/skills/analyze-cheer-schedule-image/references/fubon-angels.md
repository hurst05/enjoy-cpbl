# Fubon Angels Image Profile

Use this profile only after `src/data/defaultTeams.js` resolves the supplied
home-team name to `T4`.

## Brand Validation

Require at least one distinctive visible marker:

- `FUBON ANGELS`
- `Fubon Angels`

Do not accept blue/pink sky gradient styling or generic star icons by themselves
as team evidence.

## Matrix Layout

- Treat all supplied slides with the same title, row dates, styling, month, and
  disclaimer as one horizontal matrix split into member-column groups.
- Require every slide in the carousel or image set before exporting a row. If
  navigation dots, arrows, or a visibly clipped continuation indicate missing
  slides, ask for the missing slides.
- Read member headers from left to right on each slide and preserve slide order.
- Treat each date at the left as a schedule row (formatted as `M.D WEEKDAY`).
- A blue or purple star icon (★) at a member-column and date-row intersection
  means that member is scheduled. An empty cell means that member is absent.
- For each date, concatenate the starred member names from left to right across
  slides in their supplied carousel order.
- Reject a slide set when row dates do not align exactly, because it may mix
  different months or revisions.
- Ignore portraits when deciding attendance; only the printed header labels and
  row stars carry schedule data.

## Date Rules

The reviewed matrix prints `M.D` and the year `YYYY` (e.g. `2026 FUBON ANGELS`).
If the year is present in the artwork, use it; otherwise require the year from
explicit user input before writing JSON. Never infer it from screenshot names,
post dates, folder names, file timestamps, or the current date.

If the user requests one date, export only that row. If the user requests the
whole image set or does not narrow the request, export every visible date after
the year is confirmed.

## Verified Member Names

Accept only these labels transcribed from the reviewed Fubon Angels matrix,
preserving spelling and capitalization:

- 朴星垠
- 安娜
- 禾羽
- 維心
- 陳愉
- 貝兒
- 南珉貞
- Jessy
- 奶昔
- 潔潔
- 呱呱
- 慈妹
- 李珠珢
- 李雅英
- 小芊
- 雅惟
- 卡洛琳
- 秀秀子
- 丹丹
- 沁沁
- 檸檬
- 栗子
- 潔米
- 大頭
- 鄔語葶
- Laynee
- 李晧禎

Treat this list only as a spelling-validation set. Its size does not determine
attendance for any date. When a new or unclear label appears, ask the user for
the exact spelling, add the confirmed spelling here, and only then export JSON.

## Reviewed Sample Shape

The reviewed August 2026 matrix consists of four slides, six to seven member
columns per slide (total 27 members), and rows for `8.1 SAT`, `8.2 SUN`,
`8.7 FRI`, `8.8 SAT`, `8.9 SUN`, `8.12 WED`, `8.13 THU`, `8.21 FRI`, `8.22 SAT`,
`8.23 SUN`, `8.26 WED`, and `8.27 THU`. These values describe that sample
only. Never require future Fubon Angels schedules to have the same slide,
column, or row counts.
