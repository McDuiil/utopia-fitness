# Utopia Fitness 项目全量技术交底书 (Updated: 2026-04-07)

## 1. 项目概述 (Project Overview)
Utopia Fitness 是一款基于 React 19 + Vite 6 + Tailwind CSS 4 构建的高性能、移动优先的健身管理应用。它采用“三层数据架构（L3 Architecture）”，旨在为用户提供极致流畅的健身体验，同时确保数据的绝对安全与多端同步。

## 2. 核心功能模块 (Core Features)
- **多维仪表盘 (Dynamic Dashboard):** 
  - 实时监控：体重趋势、体脂率、热量摄入、每日热量缺口、步数、饮水量。
  - 动态组件：用户可自由开启/关闭组件，支持自定义布局。
  - 交互增强：饮水量动态波纹效果，快速记录按钮。
- **专业训练系统 (Workout System):**
  - 动作库：内置胸、背、腿、肩、臂、核心等分类动作，支持自定义动作。
  - 训练记录：支持组数、次数、重量记录，自动识别并标注 PR（个人纪录）。
  - 进度追踪：实时显示训练时长与消耗热量。
- **深度营养管理 (Nutrition Management):**
  - 饮食记录：支持餐食录入、热量及三大营养素（蛋白质、碳水、脂肪）自动计算。
  - 高级方案：支持“标准比例”、“碳水循环（Carb Cycling）”及“碳水递减（Carb Tapering）”专业计划。
- **个人中心与体脂管理 (Profile & Body Fat):**
  - 体脂历史：支持补录以往记录，自动生成体脂变化趋势。
  - 基础代谢（BMR）：基于 Mifflin-St Jeor 公式自动计算，支持手动覆盖。
  - 国际化：完整支持中英文（EN/ZH）切换。

## 3. 技术架构与构成 (Technical Architecture)
- **前端框架:** React 19 (Functional Components + Hooks).
- **构建工具:** Vite 6 (支持 HMR, 极速热更新).
- **样式方案:** Tailwind CSS 4 (原生 CSS 变量支持).
- **数据持久化 (L3 Architecture):**
  - **L1 (Local):** React State + LocalStorage (即时响应).
  - **L2 (Cloud):** Firebase Firestore (多端实时同步).
  - **L3 (Backup):** GitHub Gist (作为最终备份与跨设备迁移手段).
- **动画引擎:** Motion (Framer Motion) - 用于平滑的路由切换与组件入场。
- **图表引擎:** Recharts - 用于体重及体脂趋势的可视化。

## 4. 技术完善与优化 (Recent Improvements)
- **启动预热 (Startup Pre-bundling):** 在 `vite.config.ts` 中配置 `optimizeDeps`，强制预打包 Firebase、Recharts 等重型依赖，缩短冷启动时间。
- **安全区域适配 (Safe Area Inset):** 针对 iPhone 灵动岛（Dynamic Island）进行了深度适配，确保所有全屏模态框（如“添加动作”）的顶部内容不会被状态栏遮挡。
- **即时自定义动作 (In-session Custom Exercise):** 优化了训练流程，用户在训练过程中可直接通过搜索栏旁的“+”号创建并立即添加自定义动作，无需退出当前训练。
- **同步锁 (Sync Locking):** 引入 `isFirstSyncComplete` 逻辑，彻底解决了“启动瞬间本地默认数据覆盖云端数据”的致命 Bug。
- **模块化 SDK:** 全面采用 Firebase Modular SDK (v9+)，实现 Tree-shaking，显著减小首屏 JS 体积。
- **数据迁移 (Migration Logic):** 完善了版本迁移逻辑，确保老用户在功能更新后能平滑过渡，不丢失数据。

## 5. 保险与防崩溃措施 (Safety & Anti-Crash Measures)
- **数据保护锁 (Data Guard):** 在 Firebase 同步完成前，禁止任何写操作，防止数据冲突。
- **连接性测试 (Connection Test):** `firebase.ts` 内置连接性自动检测，若配置错误或断网，会通过控制台和 UI 及时预警。
- **错误边界 (Error Boundaries):** 关键组件包裹错误处理逻辑，防止局部错误导致整个应用白屏。
- **状态持久化:** 训练进度、体重弹窗状态等使用 `sessionStorage` 保护，防止意外刷新导致进度丢失。
- **环境隔离:** 区分开发模式与生产模式，确保 API Key 和敏感配置的安全。

## 6. 当前准备阶段 (Current Stage)
- **当前阶段:** 性能调优第一阶段 (Step 1: Infrastructure Tuning)。
- **正在准备:** 
  - 评估 Recharts 的懒加载（Lazy Loading）方案。
  - 评估路由级别的代码拆分（Code Splitting）。
  - 监控冷启动时间反馈。

## 7. 完整度评估 (Completeness)
- **功能完整度:** 95% (核心闭环已完成，包括训练、饮食、同步、体脂管理)。
- **代码健壮性:** 90% (已解决核心同步冲突问题，正处于性能优化期)。
- **UI/UX 精细度:** 92% (采用毛玻璃质感与动态反馈，适配主流移动端屏幕)。
