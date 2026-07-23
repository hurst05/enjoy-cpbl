# Uni-Girls Image Profile

Use this profile only after `src/data/defaultTeams.js` resolves the supplied
home-team name to `T5`.

## Brand Validation

Require at least one distinctive visible marker:

- `UNIGIRLS` or `UNI-GIRLS`
- `UNILIONS PRO BASEBALL TEAM CHEERLEADERS`
- The Uni-Lions `UL` team mark alongside Uni-Girls branding

Do not accept coral, orange, or pink styling by itself as team evidence.

## Layout Rules

- Treat the large portraits with adjacent nameplates as the member grid.
- Ignore decorative text and matchup logos outside the member grid.
- Read rows from top to bottom and names from left to right in each row.
- Read the date printed near the bottom and normalize separators to hyphens.
- Ignore matchup order and all opponent information.

## Verified Member Names

Accept only names confirmed through reviewed Uni-Girls samples:

- 妮妮
- Yuki
- Joy
- 瑟七
- 賴賴
- 曼萍
- 少少
- 柔一
- Maggie
- 一七
- 侯芳
- 包子
- 培根
- 冞冞
- 芮絲
- Nozomi
- 安琪
- 妍蓁
- 斐棋
- Chihiro
- 文慧真
- 魚兒
- 沐沐
- ELLA
- 若婷
- 趙娟週
- 安惠志
- 子筑
- 姿琳
- 藤本彩花
- 羽娜
- 小妤

Treat this list only as a set of verified spellings. Its size does not describe
how many members should appear in any schedule image. Never compare the number
of entries in this list with the number of parsed labels or visible portraits.

Treat similar-looking text as uncertain. In particular, preserve `培根`
exactly; do not replace it with a visually guessed alternative. When a new
name appears, ask the user for the exact spelling. After the user confirms it,
add the confirmed spelling to this list, then continue producing JSON.

## Confirmed Example

For a reviewed `2026.07.01` image, output the date as `2026-07-01`. Determine
the ordered names from that image; do not infer attendance from this allowlist.
