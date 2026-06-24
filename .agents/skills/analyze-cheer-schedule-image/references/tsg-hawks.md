# Wing Stars Image Profile

Use this profile only after `src/data/defaultTeams.js` resolves the supplied
home-team name to `T6`.

## Brand Validation

Require the visible title `台鋼雄鷹應援班表`. The dark-green palette, star
icons, portraits, or the text `應援女孩` do not establish the team by
themselves.

## Matrix Layout

- Treat all supplied slides with the same title, row dates, venues, styling,
  and month as one horizontal matrix split into member-column groups.
- Require every slide in the carousel or image set before exporting a row. If
  navigation dots, arrows, or a visibly clipped continuation indicate missing
  slides, ask for the missing slides.
- Read member headers from left to right on each slide and preserve slide order.
- Treat each date and venue at the left as a schedule row. The venue is useful
  only for aligning rows and must not appear in JSON.
- A filled dark-green star at a member-column and date-row intersection means
  that member is scheduled. An empty cell means that member is absent.
- For each date, concatenate the starred member names from left to right across
  slides in their supplied carousel order.
- Reject a slide set when row dates or venues do not align exactly, because it
  may mix different months or revisions.
- Ignore portraits when deciding attendance; only the printed header labels and
  row stars carry schedule data.

## Date Rules

The reviewed matrix prints `MM/DD` without a year. Require the year from
explicit user input before writing JSON; never infer it from screenshot names,
post dates, folder names, file timestamps, or the current date.

If the user requests one date, export only that row. If the user requests the
whole image set or does not narrow the request, export every visible date after
the year is confirmed.

## Verified Member Names

Accept only these labels transcribed from the reviewed Wing Stars matrix,
preserving spelling and capitalization:

- 安芝儇
- MINGO
- 林浠
- 瑈瑈
- 一粒
- 艾琳
- 妡0
- 黃澄澄
- JC
- 李樂
- 昆昆
- 恬魚
- 圈圈
- 螢螢
- 筱雯
- 芃芃
- 玖玖
- 毛毛
- 米亞
- 千千
- NINA
- 尼莫
- ET
- 芋頭
- 米妮
- 會晴
- 阿咪

Treat this list only as a spelling-validation set. Its size does not determine
attendance for any date. When a new or unclear label appears, ask the user for
the exact spelling, add the confirmed spelling here, and only then export JSON.

## Reviewed Sample Shape

The reviewed July matrix consists of four slides, seven member columns per
slide, and rows for `07/03`, `07/04`, `07/05`, `07/14`, `07/15`, `07/24`,
`07/25`, and `07/26`. These values describe that sample only. Never require
future Wing Stars schedules to have the same slide, column, or row counts.
