# VC800 流程配置/流程引擎交互研究报告

研究时间：2026-07-02  
研究方式：Playwright 登录原站点，非破坏性探索；未点击发布、删除、最终保存、最终暂存。

## 1. 核心结论

当前账号能完整进入“流程运行端”，但不能进入真正的“流程配置管理端”。

已验证：

- `?/lc_center/`、`?/flow/`、`?/lcwj/` 可访问。
- `?/config/flow_item_s/` 返回“没有权限访问该页面”。
- `?/flow_type/`、`?/workflow/`、`?/process/`、`?/approval/` 返回“权限不足或未配置列表显示字段”。
- 所以当前账号无法直接验证管理员配置器的拖拽编辑 UI。

但运行端暴露的信息已经足够反推出流程引擎的主体设计：

- 流程定义包含：流程分类、流程表单 schema、节点列表、连线、审批人规则、抄送/知会、网关/条件、字段联动、动态可见性、默认值、附件、子表、校验、动作权限。
- 运行时页面由统一表单容器 `pepm-form--flow` 承载，按钮通过隐藏字段 `flow_action` 进入动作分发。
- 流程图不是静态图，后端接口 `?/flow/competitive_preview/{flowId}` 会返回可渲染的节点/连线 HTML，内部有节点数组和边数组。
- 表单字段变化可以触发流程图重新预览，说明它支持基于字段条件的路径/节点竞争预览。

关键证据截图在：

- `outputs/vc800-flow-evidence/01-flow-center-list.png`
- `outputs/vc800-flow-evidence/02-seal-apply-flow-form.png`
- `outputs/vc800-flow-evidence/03-submit-validation.png`
- `outputs/vc800-flow-evidence/04-expense-dynamic-row.png`
- `outputs/vc800-flow-evidence/05-notify-selector.png`
- `outputs/vc800-flow-evidence/06-browse-advanced-search.png`

## 2. 实际验证路径

### 2.1 流程入口

左侧“流程中心”真实入口：

- `onclick="v('lc_center/');"`
- 直接路由：`https://dev.vc800.net/?/lc_center/`

流程中心分三类：

- 项目类：`?/lc_center/index`
- 基金类：`?/lc_center/flowindex_fund`
- 日常办公类：`?/lc_center/flowindex_oa`

每条流程都有两类动作：

- 申请：`?/lc_center/apply/{flowId}/` 或 `?/flow/apply/{flowId}/`
- 查看：`?/lc_center/browse/{flowId}/` 或 `?/flow/browse/{flowId}/`

示例：

- 项目费用报销：`iektet32s9`
- 员工请假：`fzpki0jlr0`
- 印章外带申请：`fuygaid044`

### 2.2 列表页行为

`browse` 页是流程实例列表页，不是配置器：

- 有高级搜索。
- 有导出。
- 有申请入口。
- 表格列按流程定义变化，例如报销流程展示“申请时间、更新时间、申请人、当前审批人、状态”；印章流程展示“所在部门、外带印章、申请带出日期、外带事由、状态”。
- 高级搜索展开后，直接把申请人、字段筛选、状态等条件塞进列表筛选区域。
- 列表数据通过类似 `?/lc_center/index_ajax/` 的接口拉取。

### 2.3 申请页行为

申请页统一结构：

- 外层：`flow-body flow-tab-proced`
- 当前节点容器：`flow_item`
- 表单：`ajax layui-form pepm-form pepm-form--flow`
- 表单 action：`/?/flow/apply/{flowId}/` 或 `/?/lc_center/apply/{flowId}/`
- 右侧/底部流程图：`flow_diagram`、`flow_board`

每个申请页有固定隐藏字段：

- `eid`：当前流程实例/草稿上下文 ID。
- `step_uuid`：当前步骤实例 ID。
- `step`：流程定义节点 ID。
- `name`：当前节点名称。
- `flow_action`：动作分发字段。
- `reject_to`：驳回目标节点。
- `transfer_to`：移交目标人。
- `addon_parallel_to`：并加签目标人。
- `jump_to`：跳转目标节点/人。
- `reject_type`：驳回类型。
- `reject_to_reason`、`disapprove_reason`、`addon_reason`、`addon_parallel_reason`：动作原因。

表单字段统一用：

- `data[field]`
- `data[field_label]`
- `data[field][]`
- `data[notify_to][]`
- `data[attachment][]`

这说明后端对表单值做 schema 化落库，不是每个流程建完全不同的提交协议。

## 3. 按钮和动作协议

申请页“提交”和“暂存”按钮都挂统一动作函数。

实测点击“提交”：

- 页面先设置隐藏字段 `flow_action=apply`。
- 然后执行前端必填校验。
- 空表单不会向 `flow/apply` 发送业务 POST。
- 校验提示示例：
  - 印章外带：`必填项不能为空: 外带印章`
  - 员工请假：`必填项不能为空: 标题`

我没有点“暂存”的最终动作，因为它很可能直接生成草稿。

静态脚本和交互验证到的动作类型包括：

- `apply`：发起/提交。
- `stash`：暂存。
- `approve`：审批通过。
- `disapprove`：不同意。
- `reject`：驳回。
- `transfer`：移交。
- `jump`：跳转。
- `addon`：加签。
- `addon_before` / `addon_after`：前加签/后加签。
- `addon_parallel`：并加签。
- `terminate`：终止。
- `abolish`：废弃/作废。
- `retract`：撤回。
- `content_commit`：正文/内容提交。

对应运行端接口包括：

- `?/flow/reject/`
- `?/flow/transfer/`
- `?/flow/jump/`
- `?/flow/addon_parallel/`
- `?/flow/addon_item/`
- `?/flow/add_inform_item/`
- `?/flow/flow_inform/`
- `?/flow/flow_urgent/`
- `?/flow/retract/`
- `?/flow/terminate/`
- `?/flow/flow_down_pdf/`
- `?/flow/get_flow_info`

我直接访问了几个动作弹层接口：

- `flow/reject/` 返回“驳回到、理由”表单。
- `flow/transfer/` 返回“移交给、理由”表单。
- `flow/jump/` 返回“跳转到、理由”表单。
- `flow/addon_parallel/` 返回“并加签给”表单。

这些动作弹层确认后并不单独完成业务，而是写入隐藏字段，再触发主表单提交。

## 4. 流程图/节点模型

关键接口：

```text
?/flow/competitive_preview/{flowId}
```

该接口返回 JSON：

- `code: 200`
- `diagram_html: ...`

`diagram_html` 内部是一段可运行的流程图组件：

- 外层：`diagram_box`
- 节点容器：`flow_board`
- SVG 连线：`svg`
- 节点循环：`node in nodes`
- 节点点击：`handleNode(node)`
- 节点 tooltip：`nodeTips(node)`
- 支持缩放、拖拽、适应窗口。

节点对象字段：

- `id`
- `name`
- `type`
- `is_current`
- `is_history`
- `is_gateway`
- `is_gateway_start`
- `is_gateway_end`
- `symbol`
- `col`
- `row`
- `act_approver_all`
- `act_approver_all_label`
- `act_approver_label`
- `no_approver_label`
- `act_copyto_label`
- `inform_label`
- `condition_info`
- `conditional_notify_info`
- `entruster_label`
- `node_action_label`
- `co_sign`

连线对象：

- `source`
- `target`

### 4.1 印章外带申请节点

`fuygaid044` 的流程图：

1. 开始
2. 发起人发起
3. 领导审批
4. 总裁审批
5. 结束

### 4.2 员工请假节点

`fzpki0jlr0` 的流程图：

1. 开始
2. 发起人发起
3. 总裁审批
4. 结束

### 4.3 项目费用报销节点

`iektet32s9` 的流程图：

1. 开始
2. 发起流程
3. AI分析节点
4. 部门负责人审核
5. 部门经理审核
6. 财务审核
7. 财务负责人审核
8. 总经理审批
9. 出纳审核
10. 结束

“出纳审核”节点同时有抄送人。

## 5. 表单引擎行为

申请页不是普通 HTML 表单，它是表单引擎渲染结果。

观察到的能力：

- 文本输入。
- 日期时间控件。
- checkbox 多选。
- select / select2 选择。
- 级联 select。
- 附件上传。
- 富文本/编辑器组件。
- 子表/明细表。
- DataTables 表格。
- 动态字段可见性。
- 默认值自动填充。
- 字段唯一性/重复性校验。
- 字段变化触发流程图预览。
- 抄送/知会人选择器。

报销流程的“报销明细”验证了子表能力：

- 点击“新增”后，会动态插入一行明细。
- 明细字段包括项目名称、费用类型、费用日期、报销金额、发票编号、天数、相关人员、备注、附件、操作。
- 新增行里也支持附件上传和 select2。

抄送/知会选择器：

- 点击“抄送”旁的人形入口后弹出选择层。
- 支持“所有人”。
- 支持用户组。
- 支持人员多选。
- 确认后写入 `data[notify_to][]`。

## 6. 条件/网关推断

虽然当前样本流程都是线性流程，但源码和 `competitive_preview` 返回结构里明确有网关字段：

- `is_gateway`
- `is_gateway_start`
- `is_gateway_end`
- `condition_info`
- `conditional_notify_info`

并且前端有“竞争预览”逻辑：

- 监听配置过的字段。
- 表单字段变化后，序列化当前表单。
- POST 到 `?/flow/competitive_preview/{flowId}`。
- 返回新的 `diagram_html` 后替换 `.flow_diagram`。

所以它的条件分支不是纯前端判断，而是：

1. 配置器定义条件表达式。
2. 运行端提交当前表单快照给后端。
3. 后端按条件算出实际路径。
4. 前端重新渲染流程图。

## 7. 页面导航机制

它不是 SPA 框架式路由，而是老式 jQuery/LayUI 局部刷新：

- 页面通过全局 `v(route, target, options)` 跳转。
- 常规内容加载到 `#canvas` 或 `#replace`。
- `v()` 会检测当前是否在 `apply/edit` 或未保存的 `pepm-form`。
- 离开流程页时，如果表单变更，会弹确认，提供“不提交、去保存、暂存、提交”。
- 如果选择暂存/提交，会动态创建或触发 `data-flow-action` 按钮，再等待保存标记。

这点对复刻很重要：侧边栏/面包屑/弹窗不是独立页面跳转，而是要与未保存流程表单联动。

## 8. 配置端应该长什么样

当前账号无法进入管理员配置器，但从运行端和接口可推导，完整配置器至少需要这些能力。

### 8.1 流程定义管理

- 流程名称。
- 流程分类：项目类、基金类、日常办公类、通用 flow。
- 启用/停用。
- 可申请范围。
- 可查看范围。
- 列表字段配置。
- 导出字段配置。
- 流程表单绑定。
- 当前版本/历史版本。

### 8.2 表单设计器

字段类型：

- text
- textarea
- number
- date/datetime
- select
- cascader/级联 select
- radio
- checkbox
- user selector
- department selector
- attachment
- rich text
- subtable/detail table
- relation/data source field
- auto fill field
- calculated field

字段配置：

- 字段 key。
- 显示标签。
- 必填。
- 默认值。
- 占位符。
- 只读。
- 隐藏。
- 选项数据源。
- 字段联动。
- 动态可见。
- 唯一性校验。
- 表达式校验。
- 运行节点权限：可见、可编辑、必填。

### 8.3 流程图配置器

节点类型：

- StartNode
- EndNode
- 普通审批节点
- AI 分析节点
- 网关开始节点
- 网关结束节点
- EmptyNode
- 知会/抄送能力

节点属性：

- 节点名称。
- 节点动作名：审批、知会、归档等。
- 审批人规则。
- 审批人全集。
- 实际审批人。
- 无审批人处理。
- 委托人。
- 抄送/知会人。
- 会签/或签。
- 条件表达式。
- 条件通知。
- 允许动作：同意、驳回、移交、跳转、加签、撤回、终止。
- 字段权限。
- 超时/催办。
- 移动端提示内容。

图布局字段：

- `col`
- `row`
- `source`
- `target`

这个设计很像“配置器保存 DSL，运行端编译成 nodes + lines + form schema”。

## 9. 后端实现建议

如果我们要把克隆产品补到这个级别，后端至少需要这些核心表。

流程定义：

- `flow_definitions`
- `flow_categories`
- `flow_versions`
- `flow_nodes`
- `flow_edges`
- `flow_node_actions`
- `flow_node_approver_rules`
- `flow_node_conditions`
- `flow_node_field_permissions`
- `flow_node_copyto_rules`

表单定义：

- `flow_forms`
- `flow_form_fields`
- `flow_form_field_options`
- `flow_form_field_rules`
- `flow_form_subtables`
- `flow_form_subtable_fields`
- `flow_form_visibility_rules`
- `flow_form_autofill_rules`

运行实例：

- `flow_instances`
- `flow_instance_steps`
- `flow_instance_tasks`
- `flow_instance_data`
- `flow_instance_subtable_rows`
- `flow_instance_attachments`
- `flow_instance_actions`
- `flow_instance_comments`
- `flow_instance_notify`

委托/权限：

- `flow_delegations`
- `flow_permissions`
- `flow_view_scopes`
- `flow_apply_scopes`

关键 API：

- `GET /api/flows`
- `GET /api/flows/{id}`
- `GET /api/flows/{id}/definition`
- `POST /api/flows/{id}/preview`
- `POST /api/flows/{id}/apply`
- `POST /api/flow-instances/{id}/action`
- `POST /api/flow-instances/{id}/reject`
- `POST /api/flow-instances/{id}/transfer`
- `POST /api/flow-instances/{id}/jump`
- `POST /api/flow-instances/{id}/addon`
- `GET /api/flow-instances`
- `GET /api/flow-instances/{id}`
- `GET /api/flow-instances/{id}/diagram`
- `GET /api/flow-instances/{id}/history`

配置器 API：

- `POST /api/admin/flow-definitions`
- `PUT /api/admin/flow-definitions/{id}`
- `POST /api/admin/flow-definitions/{id}/versions`
- `PUT /api/admin/flow-definitions/{id}/nodes`
- `PUT /api/admin/flow-definitions/{id}/edges`
- `PUT /api/admin/flow-definitions/{id}/form`
- `POST /api/admin/flow-definitions/{id}/publish`
- `POST /api/admin/flow-definitions/{id}/validate`

## 10. 前端实现建议

运行端必须做：

- 流程中心三分类列表。
- 流程实例 browse 列表。
- 高级搜索。
- 申请页动态表单。
- 表单校验。
- 暂存/提交。
- 附件上传。
- 子表新增/删除。
- 抄送选择器。
- 流程图渲染。
- 字段变化后预览路径。
- 未保存离开确认。
- 审批页动作栏。
- 驳回/移交/跳转/加签弹窗。
- 审批记录。

配置端必须做：

- 表单设计器。
- 节点画布。
- 节点属性面板。
- 条件表达式编辑器。
- 审批人规则编辑器。
- 字段权限矩阵。
- 流程校验。
- 版本发布。
- 测试预览。

流程图前端可以用 React Flow / Vue Flow / X6 这类成熟画布库实现。不要手写连线引擎。运行端只需要读 `nodes + edges` 渲染；配置端需要拖拽、连线、自动布局、节点属性。

## 11. 当前账号无法验证的部分

这些还需要管理员账号继续用 Playwright 验证：

- 真正的流程配置器入口。
- 新建流程。
- 拖拽节点。
- 节点属性面板。
- 条件分支编辑器。
- 表单设计器字段拖拽。
- 字段权限矩阵。
- 发布/版本管理。
- 配置校验规则。

当前账号看到的管理端结果：

- `?/config/flow_item_s/`：无权限。
- `?/flow_type/`：权限不足或未配置列表显示字段。
- `?/workflow/`：权限不足或未配置列表显示字段。
- `?/process/`：权限不足或未配置列表显示字段。
- `?/approval/`：权限不足或未配置列表显示字段。

## 12. 对我们项目的实现缺口

如果要达到原系统级别，不能只做“流程列表 + 状态卡片”。至少要补齐：

1. 流程定义 DSL。
2. 表单 schema 渲染器。
3. 节点/边数据模型。
4. 条件表达式执行器。
5. 审批人解析器。
6. 运行实例状态机。
7. 动作分发器。
8. 流程图预览接口。
9. 配置器画布。
10. 表单设计器。
11. 字段权限矩阵。
12. 审批动作弹窗。
13. 高级搜索和导出。
14. 附件/子表/抄送/委托。

最小可信目标不是 MVP，而是“配置器 + 运行端 + 状态机”三件套同时存在。

