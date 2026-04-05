# Bes3 基于 Google AI 电商方法的完整优化方案

## 0. 文档目标

本文基于 `docs/谷歌是如何做AI电商的.md`，结合 Bes3 当前代码与已有规划文档，做一轮面向当前项目的多轮迭代分析，并给出可执行的完整优化方案。

这份方案的前提不是“把 Bes3 改造成另一个 Google”，而是：

- 保持 Bes3 作为消费者导购站的定位。
- 吸收 Google 在 AI 电商里真正有效的方法。
- 避免把不适合当前阶段的重资产能力硬塞进项目。

一句话结论：

> Bes3 现在已经有“导购站骨架”，但还没有真正长成“AI 电商操作层”。下一阶段不该继续单纯堆评测页，而应该补齐三件事：`意图理解`、`实时商品图谱`、`可被 AI 代理消费的标准化交易接口`。

---

## 1. 迭代一：先把 Google 方案拆成可迁移能力

从 `docs/谷歌是如何做AI电商的.md` 提炼后，Google 的 AI 电商能力不是一个点，而是五层组合：

### 1.1 对话式意图入口

- 用户不再只搜关键词，而是表达场景、预算、顾虑和限制条件。
- 系统先理解“你为什么买、现在卡在哪”，再返回商品。
- 搜索入口逐步从检索型，变成决策协助型。

### 1.2 实时商品图谱

- 底层不是普通内容库，而是高频更新的商品事实层。
- 价格、库存、尺码、规格、促销、评价、品牌资料都要结构化。
- AI 不能只会写，它必须先读对。

### 1.3 低成本内容生产

- 商品图、卖点图、内容素材生产要足够快。
- 页面不是单篇文章，而是围绕商品事实自动衍生的多种表现层。
- 内容生产的核心从“写什么”转向“如何快速把可信事实组织成不同场景输出”。

### 1.4 AI 原生商家层

- 品牌不只是投广告，而是把退换货、兼容性、优惠、会员权益等信息结构化暴露出来。
- 品牌需要可被 AI 调用的“问答能力”和“优惠能力”。

### 1.5 协议化交易层

- 最终目标不是再做一个内容站，而是让外部 AI 或内部 AI 可以安全地读商品、比商品、拿报价、触发交易动作。
- 协议层一旦建立，页面只是其中一个消费端。

对 Bes3 最重要的启发不是虚拟试穿，而是：

- `Search -> Intent`
- `Content DB -> Commerce Graph`
- `Affiliate Redirect -> Agent-Ready Commerce API`

---

## 2. 迭代二：Bes3 当前已经有什么

结合当前代码，Bes3 已经不是“纯文档构想”，而是一个有明确用户链路和后台流水线的导购系统。

### 2.1 前台已具备的能力

从 `src/app/page.tsx`、`src/app/start/page.tsx`、`src/app/search/page.tsx`、`src/app/products/[slug]/page.tsx`、`src/app/reviews/[slug]/page.tsx`、`src/app/compare/[slug]/page.tsx`、`src/app/deals/page.tsx` 可以看出，当前站点已经有：

- 首页、Start、Search、Directory、Deals、Brands、Category
- Product / Review / Compare / Guide 四类核心内容页
- Shortlist、Compare、Newsletter、Tools 等辅助决策路径
- “低压力 CTA”与“继续观察价格”的用户链路

### 2.2 后台已具备的能力

从 `src/lib/pipeline.ts`、`src/components/admin/ProductWorkspaceConsole.tsx`、`src/lib/bootstrap.ts` 可以看出，后台已经有：

- 商品导入与联盟同步
- 商品页抓取、媒体抓取、关键词挖掘
- Review / Comparison / SEO 自动生成
- Prompt 版本管理
- 队列化的 Pipeline Worker
- 运营控制台与工作区

### 2.3 数据层已具备的能力

从 `src/lib/db/schema.ts`、`src/lib/site-data.ts` 可以看出，目前已经有这些核心表：

- `affiliate_products`
- `products`
- `product_media_assets`
- `keyword_opportunities`
- `articles`
- `seo_pages`
- `content_pipeline_runs`
- `merchant_click_events`
- `buyer_decision_events`
- `newsletter_subscribers`

这说明 Bes3 已经具备了四个重要基础：

- 有商品实体
- 有内容实体
- 有行为事件
- 有可持续运营的后台

### 2.4 已有但还很初级的开放能力

`src/app/api/open/buying-feed/route.ts` 已经提供一个只读 JSON feed，说明项目已经有“对外暴露可消费数据”的意识，但目前仍非常轻量：

- 只输出少量字段
- 没有意图查询能力
- 没有报价/库存/优惠细节
- 没有 agent action
- 没有 freshness / confidence / evidence 字段

---

## 3. 迭代三：Bes3 距离 Google 式 AI 电商还差什么

这一步最关键。不是看“功能少不少”，而是看“系统重心对不对”。

## 3.1 用户入口仍然是页面型，不是意图型

虽然 Bes3 已经强调 buyer intent，但目前主入口仍然是：

- 搜索关键词
- 打开某个页面类型
- 在页面中再做下一步

问题是：

- 系统还不会先收集预算、使用场景、必须项、排斥项
- 也不会根据上下文连续追问
- 更没有形成“一个会话里的动态 shortlist”

这意味着 Bes3 现在更像“结构很好的导购网站”，而不是“真正的 AI shopping assistant”。

## 3.2 商品数据还是单点快照，不是商品图谱

当前 `products` 表够支撑页面，但不够支撑 AI 电商：

- 价格是单值，不是多商家报价集合
- 没有报价历史和波动视图
- 没有库存状态演化
- 没有变体维度
- 没有属性完整度评分
- 没有规格来源可信度
- 没有“最后验证时间 + 证据来源”

换句话说，Bes3 现在存的是“能展示”的商品数据，不是“能被 AI 安全消费”的商品数据。

## 3.3 AI 生成链路还偏轻

从 `src/lib/ai.ts` 与默认 prompts 看，当前生成链路更接近：

- 关键词生成
- 一篇 review
- 一篇 comparison
- 一组 SEO 元数据

这里有三个明显问题：

- 事实抽取和观点生成没有拆层
- 缺少 grounding / evidence 约束
- Prompt 仍偏通用，没有针对“购买决策节点”建模

这会限制后续做：

- 对话式推荐
- 精准 FAQ
- 品类差异化比较
- 代理式商品问答

## 3.4 协议层几乎还没开始

当前公开能力本质上仍是：

- 页面 URL
- JSON feed
- 跳转到 merchant

距离 Google 文中强调的协议层，还差：

- `search by intent`
- `get comparable offers`
- `get structured product facts`
- `create shortlist`
- `quote eligibility`
- `coupon / deal injection`
- `checkout intent` 或至少 `handoff intent`

这不是“多加几个 API”就够，而是要把 Bes3 从页面驱动，升级为“页面 + agent interface 双栈”。

## 3.5 视觉与内容生产层还没形成工厂化能力

当前有商品媒体抓取，但没有真正的“内容工厂”：

- 没有商品卖点卡图生成
- 没有对比图模板化生成
- 没有价格变化可视化自动产出
- 没有社媒/摘要素材自动输出
- 没有 merchant FAQ / policy card 的可视化组件体系

对 3C 品类而言，虚拟试穿优先级很低，但“规格图、对比图、价格窗口图、兼容性图”优先级很高。

---

## 4. 迭代四：针对 Bes3 的正确战略，不该照搬什么

如果机械照搬 Google，会浪费大量资源。结合 Bes3 当前定位，下面几条必须明确。

### 4.1 不要先做完整即时结账

Bes3 当前商业模式仍是联盟导购，不是 merchant of record。

所以近期正确方向不是“站内支付”，而是：

- 先把推荐和导流做到更高置信度
- 再把 merchant handoff 标准化
- 最后再考虑深度交易协议

### 4.2 不要把首页直接做成聊天机器人外壳

Bes3 的 SEO 页面资产仍然重要，不能为了 AI 化把整个站点做成只剩一个聊天框。

更合理的是：

- 页面继续承担 SEO 和证据展示
- AI 助手承担入口分流和动态决策
- 两者共存，而不是互相替代

### 4.3 不要优先做服饰式 VTO

当前项目品类以 3C / tech 为主，Google 的虚拟试穿经验并不直接适配。

Bes3 应优先投入：

- 规格归一化
- 兼容性判断
- 多商家报价
- 价格波动
- 使用场景匹配

### 4.4 不要继续把 AI 只用在“批量写文”

如果 AI 仍主要服务于“快速出 review 文案”，Bes3 的上限会很低。

AI 的新主战场应转向：

- 意图理解
- 商品排序
- 证据归纳
- 结构化问答
- 决策推进

---

## 5. 迭代五：Bes3 的目标形态

下一阶段的 Bes3，应该从“导购内容站”升级为“三层系统”。

### 5.1 第一层：Buyer Copilot

面向用户，负责：

- 接收自然语言购物需求
- 生成和维护动态 shortlist
- 解释推荐理由
- 根据价格/预算/必选项动态改写推荐
- 在“现在买 / 再比较 / 等价格”之间切换下一步

### 5.2 第二层：Commerce Graph

面向机器，负责：

- 保存可验证商品事实
- 保存多商家报价与状态
- 保存规格、兼容性、证据、价格历史
- 输出 freshness、confidence、completeness

### 5.3 第三层：Agent-Ready Commerce Interface

面向外部系统或未来内部 agent，负责：

- 搜索
- 商品详情
- 对比
- 报价
- 价格提醒
- merchant handoff

这三层一旦成型，Bes3 才真正具备“AI 电商基础设施”的雏形。

---

## 6. 完整优化方案

## 6.1 体验层优化

### A. 新增意图会话入口

建议新增一个 `AI Start` 入口，而不是替换现有首页。

建议落点：

- 在 `/start` 增加“Tell Bes3 what you need”入口
- 或新增 `/assistant` 页面

核心交互：

- 用户输入自然语言需求
- 系统追问 2 到 4 个关键问题
- 输出动态 shortlist
- 给出明确下一步：`Open product` / `Compare finalists` / `Track better price`

首版不需要复杂多轮 agent，只需要三段式：

1. 意图解析
2. 约束补齐
3. 候选排序与解释

### B. 把 Search 升级成“意图检索”

当前 `src/app/search/page.tsx` 更偏站内搜索。

应升级为双模式：

- `Keyword Search`
- `Need-Based Search`

Need-Based Search 需要支持的输入：

- use case
- budget
- must-have specs
- avoid list
- urgency

### C. Shortlist 升级为“动态决策工作区”

当前 shortlist 已经有不错基础，但下一步应该升级为：

- 按场景分组
- 自动标出 proof gaps
- 标出每个候选缺失的关键证据
- 自动建议“删谁 / 比谁 / 等谁降价”

### D. Deals 页升级为“报价决策页”

`src/app/deals/page.tsx` 目前更像精选 deals 列表。

建议升级为：

- 展示价格是否处于历史合理区间
- 展示同类替代品当前价格
- 展示“适合买 / 适合等”的判断依据
- 支持按类目、预算、降幅筛选

---

## 6.2 数据层优化

这是整个方案的核心优先级，应该先于重 UI。

### A. 把单商品模型升级为商品图谱

建议新增以下实体：

- `merchants`
- `product_variants`
- `offer_snapshots`
- `price_history`
- `product_attributes`
- `attribute_evidence`
- `brand_policies`
- `compatibility_facts`

建议新增关键字段：

- `availability_status`
- `shipping_cost`
- `coupon_text`
- `coupon_type`
- `price_last_checked_at`
- `offer_last_checked_at`
- `attribute_completeness_score`
- `data_confidence_score`
- `source_count`

### B. 引入“多报价视图”

当前 `products.price_amount` 只能存一个价格，不足以支撑比较和推荐。

应该改成：

- 商品层保留 `best_known_price` 供页面快速展示
- 报价层单独存多 merchant 的实时快照
- 页面与 API 都从报价层汇总出“当前最佳报价”

### C. 引入“证据化字段”

每个关键规格或判断，最好能追溯：

- 来源页面
- 来源类型
- 抓取时间
- 是否人工确认

这样后续才能做：

- answer confidence
- stale data alert
- attribute QA

### D. 建立价格历史和 freshness 体系

对 3C 导购站而言，Google 文中的 Shopping Graph 里最值得 Bes3 先学的是“实时性”。

建议为重点 SKU 建立：

- 小时级或天级价格历史
- 报价失效检查
- 页面 freshness 徽标
- 后台 freshness SLO 看板

---

## 6.3 AI 与内容层优化

### A. 把生成链路拆成六段

当前 `src/lib/ai.ts` 建议从 4 个 prompt 扩成更清晰的责任拆分：

1. `fact_extraction`
2. `buyer_fit_reasoning`
3. `comparison_reasoning`
4. `seo_schema_generation`
5. `faq_question_mining`
6. `assistant_answering`

最关键的一步是：

- 先抽事实
- 再基于事实做推荐和表达

### B. 引入“事实层”和“观点层”分离

页面内容应从单次生成，升级为组合生成：

- 事实层：规格、价格、兼容性、评论证据、更新时间
- 观点层：适合谁、不适合谁、为什么推荐、何时不该买

这样可以避免：

- price hallucination
- specs hallucination
- 观点混入事实

### C. Prompt 管理升级为“Prompt + Eval”

当前已有 prompt versioning，这是好基础。

下一步需要加：

- 样例集
- 对比评分
- fail cases
- 线上 prompt 效果回看

评估维度建议至少包括：

- 事实准确率
- 解释可读性
- 推荐一致性
- CTA 合理性

### D. 页面不再只生成长文，还要生成结构化模块

建议让 pipeline 输出的不只是 `article.html`，还包括：

- key takeaways
- buyer fit cards
- watch-out cards
- spec highlights
- price window summary
- FAQ blocks
- compare bullets

这样同一套数据可以复用在：

- 产品页
- 对比页
- 搜索页
- AI 助手答复
- 开放接口

---

## 6.4 Merchant / 品牌层优化

### A. 建立品牌政策知识层

Google 方案里一个非常关键的点是：AI 不只是回答“哪个好”，还要回答“退换货怎么办、兼容吗、会员有什么权益”。

Bes3 可以先做一个轻量版本：

- 品牌运费政策
- 退换货政策
- 保修年限
- 常见兼容性问题
- 官方折扣窗口

这部分可以先由后台录入或抓取，再在页面和 AI 助手中复用。

### B. 把优惠从纯链接，升级为“可解释优惠”

当前 CTA 更像通往 merchant 的门。

下一步应该在跳转前展示：

- 当前是否有 coupon
- 优惠是否已计入价格
- 报价来自哪个 merchant
- 为什么这是当前推荐报价

### C. 在后台加入数据质量控制台

建议新增 merchant / offer 质量面板，重点看：

- 哪些商品缺核心属性
- 哪些报价超过 freshness 阈值
- 哪些商品缺多 merchant 对照
- 哪些页面没有足够 evidence blocks

---

## 6.5 协议层与开放接口优化

这是 Bes3 最应该提前布局、但不一定一次做完的部分。

### A. 把 `buying-feed` 升级成 `Commerce Feed v2`

建议保留现有 `src/app/api/open/buying-feed/route.ts`，并新增 `/api/open/commerce/*`。

第一批接口建议：

- `GET /api/open/commerce/search`
- `GET /api/open/commerce/products/:id`
- `GET /api/open/commerce/products/:id/offers`
- `POST /api/open/commerce/compare`
- `POST /api/open/commerce/alerts`

接口返回中必须补齐：

- `freshness`
- `confidence`
- `bestOffer`
- `alternativeOffers`
- `fitSummary`
- `notForSummary`
- `evidence`

### B. 建立“代理友好”的响应格式

不要只输出页面字段，要让外部 AI 能直接消费。

建议统一返回：

- 基础实体
- 结构化 attributes
- decision summaries
- actions
- disclaimers

### C. 先做 handoff protocol，再谈 checkout protocol

当前阶段建议的协议目标不是结账，而是：

- 推荐
- 对比
- 选择 merchant
- 进入 merchant

也就是先做 `decision handoff protocol`，而不是过早做支付闭环。

---

## 6.6 观测与运营优化

当前项目已经有 `merchant_click_events` 和 `buyer_decision_events`，这非常关键，说明闭环基础已经存在。

下一步要把事件体系从“有记录”升级为“能指导系统进化”。

### A. 增加关键事件

建议新增：

- `assistant_session_start`
- `assistant_constraint_add`
- `assistant_recommendation_accept`
- `assistant_recommendation_reject`
- `offer_expand`
- `price_history_view`
- `alert_subscribe_from_assistant`
- `merchant_offer_select`

### B. 增加关键看板

建议在 Dashboard 中新增：

- 属性完整度分布
- 商品 freshness 分布
- offer coverage 分布
- assistant -> shortlist 转化
- shortlist -> compare 转化
- compare -> merchant handoff 转化
- alert subscribe -> revisit 转化

### C. 引入“数据质量优先级”

建议让系统先修数据差的商品，而不是盲目生成新内容。

一个简单排序模型即可：

- 高流量
- 高点击
- 低完整度
- 低 freshness
- 高商业价值

优先修这些商品。

---

## 7. 分阶段实施路线图

## Phase 1：先把底层数据做对

目标：

- 从内容站升级到商品图谱雏形

交付：

- 扩充 `schema.ts`
- 新建 offers / price history / attributes 表
- pipeline 抓取报价与属性 evidence
- 页面增加 freshness 与报价来源说明

优先修改区域：

- `src/lib/db/schema.ts`
- `src/lib/scraper.ts`
- `src/lib/pipeline.ts`
- `src/lib/site-data.ts`

## Phase 2：把 Search / Start 升级为意图入口

目标：

- 让用户先说需求，再进入页面

交付：

- `/start` 增加 AI intake
- `/search` 增加 need-based mode
- 新增 shortlist recommendation payload

优先修改区域：

- `src/app/start/page.tsx`
- `src/app/search/page.tsx`
- `src/components/site/*`
- `src/lib/ai.ts`

## Phase 3：把内容生成升级为证据驱动

目标：

- 从“会写”升级为“会证明”

交付：

- prompts 拆层
- 新增 evidence blocks
- 页面支持结构化推荐卡
- prompt eval 机制

优先修改区域：

- `src/lib/ai.ts`
- `src/lib/prompts.ts`
- `src/lib/bootstrap.ts`
- `src/app/products/[slug]/page.tsx`
- `src/app/reviews/[slug]/page.tsx`
- `src/app/compare/[slug]/page.tsx`

## Phase 4：开放协议层

目标：

- 让 Bes3 不只服务页面，也能服务 agent

交付：

- `commerce/search`
- `commerce/product`
- `commerce/offers`
- `commerce/compare`
- `commerce/alerts`

优先修改区域：

- `src/app/api/open/*`
- `src/lib/site-data.ts`
- `src/lib/merchant-links.ts`

## Phase 5：品牌层与运营闭环

目标：

- 建立 merchant knowledge + data QA + conversion ops

交付：

- brand policy 数据
- admin 质量面板
- event 与 dashboard 扩展
- 基于数据质量的重抓取和重生成

优先修改区域：

- `src/lib/pipeline.ts`
- `src/components/admin/*`
- `src/lib/decision-events.ts`
- `src/lib/merchant-clicks.ts`

---

## 8. 对当前项目最重要的优先级排序

如果只能选三件事，建议顺序必须是：

1. `商品图谱化`
2. `意图入口化`
3. `开放协议化`

不建议当前优先做的方向：

- 站内即时结账
- 服饰式 VTO
- 继续大批量生成长文而不补底层事实
- 只改首页 UI，不改数据和接口

---

## 9. 最终落地判断标准

方案是否成功，不看页面数量，而看下面几个指标是否提升：

- 用户是否能更快从需求进入 shortlist
- 页面是否能展示更可信的实时价格与证据
- 推荐是否可解释、可追踪、可复算
- 对外是否已经能以 API 形式暴露商品与报价能力
- 后台是否开始优先修复高价值低质量数据

如果这五件事成立，Bes3 就不再只是一个“写得更像人的导购站”，而会开始变成一个真正的 AI 电商底层。

---

## 10. 一句话版执行建议

Bes3 的下一步，不是继续把导购页面写得更花，而是先把 `商品事实层` 做厚，把 `用户意图层` 做活，再把 `交易接口层` 做成标准化出口。
