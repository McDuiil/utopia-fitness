# Utopia Fitness 系统约束（必须遵守）

## 1. ID 规则
* 每条记录必须有全局唯一 ID
* ID 一旦创建不可修改
* 合并逻辑依赖 ID 做 Map 匹配

## 2. updatedAt 规则
* 每次新增 / 修改 / 删除必须更新 updatedAt
* updatedAt 必须递增（不能复用旧值）
* 用于 LWW（Last-Write-Wins）冲突裁决

## 3. 删除规则
* 禁止物理删除数据（除非触发安全清理机制）
* 用户删除必须使用 `deleted: true`（Soft Delete）

## 4. 合并规则
* 使用 ID + updatedAt 进行合并
* newer updatedAt 覆盖 older
* 不允许字段级 merge（当前为对象级覆盖）

## 5. 归档与清理规则
* 超过 90 天的数据自动标记 `archived: true`
* 只有同时满足 `archived: true` && `deleted: true` && `updatedAt` 超过 90 天的数据才允许物理清理
* archived 数据仅用于历史追溯，不参与主仪表盘的实时计算

## 6. 已知限制
* 时间戳使用客户端时间（Date.now），可能存在跨设备微小误差
* LWW 会覆盖旧写入，不保证字段级合并
* 系统为单用户多端设计，不支持多人协同编辑同一条记录

任何违反以上规则的修改，都会破坏系统一致性。
