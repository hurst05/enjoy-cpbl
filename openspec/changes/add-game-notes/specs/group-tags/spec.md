# Group Tags Delta Spec

## ADDED Requirements

### Requirement: 在賽事詳情查看群友備註

系統 MUST 讓已登入使用者在 GameModal 查看同群組成員針對目前賽事留下的非空白
備註，且每位成員每場最多顯示一則。

#### Scenario: 群友留有備註

- **WHEN** 已登入使用者開啟一場有群友備註的賽事
- **THEN** 系統顯示群友名稱與該場備註內容
- **AND** 登入者本人的備註不會重複出現在群友備註清單

#### Scenario: 多個群組包含同一位群友

- **WHEN** 登入者與同一位群友同時加入多個群組
- **THEN** 該群友針對目前賽事的備註只顯示一次

#### Scenario: 群友沒有備註

- **WHEN** 目前賽事沒有任何群友留下非空白備註
- **THEN** 系統不顯示空的群友備註清單

#### Scenario: 未登入使用者開啟賽事

- **WHEN** 未登入使用者開啟 GameModal
- **THEN** 系統不顯示群友備註
