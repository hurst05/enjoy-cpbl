# Passion Sisters Image Profile

Use this profile only after `src/data/defaultTeams.js` resolves the supplied
home-team name to `T1`.

## Brand Validation

Require at least one distinctive visible marker:

- `Passion Sisters`
- `應援班表` alongside the Passion Sisters logo
- CTBC Brothers wording in the disclaimer, such as `中信兄弟球團`

Do not accept yellow uniforms, pink styling, elephant icons, or the word
`SCHEDULE` by themselves as team evidence.

## Matrix Layout

- Treat all supplied slides with the same title, row dates, styling, month, and
  disclaimer as one horizontal matrix split into member-column groups.
- Require every slide in the carousel or image set before exporting a row. If
  navigation dots, arrows, or a visibly clipped continuation indicate missing
  slides, ask for the missing slides.
- Read member headers from left to right on each slide and preserve slide order.
- Treat each date at the left as a schedule row. Ignore weekdays and all small
  adjacent notes after using them only to align rows.
- A blue elephant icon at a member-column and date-row intersection means that
  member is scheduled. An empty cell means that member is absent.
- For each date, concatenate the elephant-marked member names from left to
  right across slides in their supplied carousel order.
- Reject a slide set when row dates do not align exactly, because it may mix
  different months or revisions.
- Ignore portraits when deciding attendance; only the printed header labels and
  row elephant icons carry schedule data.

## Date Rules

The reviewed matrix prints `MM/DD` without a year. Require the year from
explicit user input before writing JSON; never infer it from screenshot names,
post dates, folder names, file timestamps, or the current date.

If the user requests one date, export only that row. If the user requests the
whole image set or does not narrow the request, export every visible date after
the year is confirmed.

## Verified Member Names

Accept only these labels transcribed from the reviewed Passion Sisters matrix,
preserving spelling and capitalization:

- 妮可
- 林可
- 君白
- 曼容
- 小迪
- 夏蕾
- 沛婕
- 少鹽
- 貴貴
- 峮峮
- 凱蒂
- 短今
- 希希
- 波波
- 晴兒
- 昀二
- 荷律
- 渡兒
- JJUBI
- 汶汶
- 怡琪
- WENDY
- 衣宸
- 桃子
- 維尼
- 瑄
- 莎莎
- 芊芊
- 璇璇
- 牛奶
- 珮含
- 容容

Treat this list only as a spelling-validation set. Its size does not determine
attendance for any date. When a new or unclear label appears, ask the user for
the exact spelling, add the confirmed spelling here, and only then export JSON.

## Reviewed Sample Shape

The reviewed July matrix consists of four slides, eight member columns per
slide, and rows for `07/03`, `07/04`, `07/05`, `07/14`, `07/15`, `07/21`,
`07/22`, `07/24`, `07/25`, and `07/26`. These values describe that sample
only. Never require future Passion Sisters schedules to have the same slide,
column, or row counts.
