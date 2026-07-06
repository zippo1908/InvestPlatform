# 全量数据、权限和流程说明

## 核心对象

- Project：项目/企业/投资机会。
- Fund：基金/投资主体。
- InvestmentPosition：基金对项目的投资关系。
- EquityChange：权益变动。
- Cashflow：投资人现金流、项目现金流、其他现金流。
- Investor：LP/投资人。
- ManagementOrg：管理机构。
- PortfolioReport：投后数据。
- RiskClause：关键条款。
- IncidentRisk：突发风险事件。
- Document：文档。
- WorkflowTemplate / WorkflowInstance / WorkflowTask：流程模板、实例、任务。
- ResearchNote：行研和内部产研。
- AiParseJob：AI 解析任务。
- User / Role / PermissionPolicy / AuditLog：用户、角色、权限和审计。

## 权限模型

- 菜单权限：控制模块入口。
- 操作权限：查看、新增、编辑、删除、导入、导出、审批、下载。
- 数据范围：全部、本部门、本部门及下级、本人负责、本人参与、自定义。
- 字段权限：隐藏、只读、可编辑。
- 文档权限：预览、下载、编辑、删除、分享、水印。

## 流程模型

- 项目类：立项、尽调、投决、协议、打款、退出。
- 基金类：设立、付款、披露、条款变更、财报。
- OA 类：用印、报销、请假、行政。
- 所有流程均需支持发起、审批、驳回、转办、抄送、委托、归档和审计。

## 安全红线

- 服务端密钥不得进入前端 HTML 或 JS。
- 文件访问必须二次鉴权。
- 导出必须异步任务化并审计。
- 所有敏感数据按权限脱敏显示。
