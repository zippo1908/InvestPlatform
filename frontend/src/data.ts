export type PageKind =
  | 'auth'
  | 'dashboard'
  | 'ai'
  | 'list'
  | 'board'
  | 'form'
  | 'detail'
  | 'flow'
  | 'documents'
  | 'risk'
  | 'report'
  | 'admin'
  | 'settings'
  | 'recycle'

export type Screen = {
  id: string
  title: string
  group: string
  description: string
  kind: PageKind
  primaryAction: string
  tabs?: string[]
}

export type DataRow = Record<string, string | number>

export type Project = {
  name: string
  company: string
  stage: string
  sector: string
  city: string
  owner: string
  status: string
  fund: string
  amount: number
  risk: string
  nextStep: string
}

export const screens: Screen[] = [
  {
    id: 'login',
    title: '登录页',
    group: '入口',
    description: '账号、登录口令、验证码、自动登录和安全提示',
    kind: 'auth',
    primaryAction: '进入系统',
  },
  {
    id: 'workbench',
    title: '管理层工作台',
    group: '工作台',
    description: '待办、关键指标、项目阶段、基金组合和风险热区',
    kind: 'dashboard',
    primaryAction: '刷新经营看板',
  },
  {
    id: 'ai-workspace',
    title: 'AI 大模型工作台',
    group: '工作台',
    description: '文件解析、会议摘要、协议条款提取和投研问答',
    kind: 'ai',
    primaryAction: '上传解析材料',
  },
  {
    id: 'announcements',
    title: '通知公告',
    group: '协同工具',
    description: '公告列表、发布、导入、导出和阅读范围',
    kind: 'list',
    primaryAction: '发布公告',
  },
  {
    id: 'calendar',
    title: '日程事件',
    group: '协同工具',
    description: '周日程、月日程、列表和关联项目/基金日程',
    kind: 'list',
    primaryAction: '新增日程',
  },
  {
    id: 'message-center',
    title: '消息中心',
    group: '协同工具',
    description: '未读、全部、我的待办、我的已办、我的申请和抄送',
    kind: 'list',
    primaryAction: '全部标为已读',
  },
  {
    id: 'flow-center',
    title: '流程中心总览',
    group: '流程中心',
    description: '项目类、基金类、日常办公类流程入口和委托设置',
    kind: 'flow',
    primaryAction: '设置审批委托',
  },
  {
    id: 'flow-project',
    title: '项目类流程',
    group: '流程中心',
    description: '立项、尽调、投决、投资协议、打款、退出流程',
    kind: 'flow',
    primaryAction: '发起项目流程',
  },
  {
    id: 'flow-fund',
    title: '基金类流程',
    group: '流程中心',
    description: '基金设立、付款、LP 披露、条款变更和财报审批',
    kind: 'flow',
    primaryAction: '发起基金流程',
  },
  {
    id: 'flow-oa',
    title: '日常办公流程',
    group: '流程中心',
    description: '行政、人事、用印、报销和请假流程',
    kind: 'flow',
    primaryAction: '发起 OA 流程',
  },
  {
    id: 'project-board',
    title: '项目池看板',
    group: '项目管理',
    description: '入库、立项、TS、尽调、内审、投决、协议、打款、投后服务',
    kind: 'board',
    primaryAction: '新增项目',
  },
  {
    id: 'project-list',
    title: '项目列表',
    group: '项目管理',
    description: '高级搜索、显示列、导入、导出、新增和批量操作',
    kind: 'list',
    primaryAction: '新增项目',
  },
  {
    id: 'project-add',
    title: '新增项目',
    group: '项目管理',
    description: 'BP 上传、AI 解析填充、项目基础信息和描述字段',
    kind: 'form',
    primaryAction: '提交立项',
  },
  {
    id: 'project-detail-overview',
    title: '项目详情',
    group: '项目管理',
    description: '从左侧项目目录选择项目,查看主档、阶段、投资情况、投后数据等全部信息',
    kind: 'detail',
    primaryAction: '发起尽调流程',
    tabs: ['概况', '日程', '基金投资', '权益变动', '三会', '现金流', '估值', '投后数据', '协议条款 AI', '流程文件', '文档'],
  },
  {
    id: 'meeting-ai',
    title: '纪要解析',
    group: '项目管理',
    description: '会议文件上传、AI 摘要、决策结果、讨论要点和下一步计划',
    kind: 'ai',
    primaryAction: '上传会议纪要',
  },
  {
    id: 'fund-list',
    title: '基金列表',
    group: '基金管理',
    description: '基金状态、规模、净值、托管、认缴实缴和累计投资',
    kind: 'list',
    primaryAction: '新增基金',
  },
  {
    id: 'fund-add',
    title: '新增基金',
    group: '基金管理',
    description: '基础信息、规模、期限、投资策略、管理费、分配、治理和披露',
    kind: 'form',
    primaryAction: '提交基金主档',
  },
  {
    id: 'fund-detail-overview',
    title: '基金详情',
    group: '基金管理',
    description: '从左侧基金目录选择基金,查看条款、规模、现金流、组合表现、财报等全部信息',
    kind: 'detail',
    primaryAction: '发起基金付款',
    tabs: ['概况', '日程', '投资人现金流', '项目现金流', '其他现金流', '投资组合', '财报数据', '流程文件', '文档'],
  },
  {
    id: 'investment-info',
    title: '投资信息',
    group: '基金管理',
    description: '项目投资台账、协议金额、打款、持股、回款和退出状态',
    kind: 'list',
    primaryAction: '新增投资',
  },
  {
    id: 'equity-change',
    title: '权益变动',
    group: '基金管理',
    description: '股权变更原因、协议时间、轮次、领投、投资方式和股比变化',
    kind: 'list',
    primaryAction: '新增权益变动',
  },
  {
    id: 'investor-list',
    title: '投资人列表',
    group: '投资人',
    description: 'LP/投资人档案、认缴实缴、联系人和披露状态',
    kind: 'list',
    primaryAction: '新增投资人',
  },
  {
    id: 'investor-detail',
    title: '投资人详情',
    group: '投资人',
    description: '档案、基金份额、现金流、联系记录和披露文件',
    kind: 'detail',
    primaryAction: '新增沟通记录',
    tabs: ['档案', '基金份额', '现金流', '联系人', '披露材料', '沟通记录', '文档'],
  },
  {
    id: 'manager-orgs',
    title: '管理机构',
    group: '投资人',
    description: 'GP、管理人、执行事务合伙人和关联基金',
    kind: 'list',
    primaryAction: '新增机构',
  },
  {
    id: 'post-data-collection',
    title: '投后数据收集',
    group: '投后管理',
    description: '外部填报、邮件发送、填报状态重置和数据回流',
    kind: 'list',
    primaryAction: '发送填报邮件',
  },
  {
    id: 'risk-clauses',
    title: '项目关键条款',
    group: '风险管理',
    description: '基金、项目、轮次、特殊条款、条款内容、提醒日期和状态',
    kind: 'risk',
    primaryAction: '新增条款',
  },
  {
    id: 'burst-risk',
    title: '突发风险事务',
    group: '风险管理',
    description: '风险事件登记、等级、处置方案、负责人和进展',
    kind: 'risk',
    primaryAction: '登记风险事件',
  },
  {
    id: 'document-center',
    title: '文档中心',
    group: '文档管理',
    description: '项目类文件、基金类文件、共享类文件、流程文件和权限水印',
    kind: 'documents',
    primaryAction: '上传文档',
  },
  {
    id: 'process-files',
    title: '流程文件',
    group: '文档管理',
    description: '从流程归档的审批文件、合同、用印材料和付款附件',
    kind: 'documents',
    primaryAction: '导出归档目录',
  },
  {
    id: 'research-library',
    title: '行研智库',
    group: 'AI 数据库',
    description: '行研摘录、标签、来源、AI 摘要和关联项目',
    kind: 'list',
    primaryAction: '新增摘录',
  },
  {
    id: 'internal-research',
    title: '内部产研',
    group: 'AI 数据库',
    description: '内部报告、研究文档、附件、评审和知识沉淀',
    kind: 'list',
    primaryAction: '提交研究报告',
  },
  {
    id: 'report-dashboard',
    title: '报表驾驶舱',
    group: '报表驾驶舱',
    description: 'IRR、DPI、TVPI、MOIC、行业分布、阶段分布和资金流',
    kind: 'report',
    primaryAction: '导出驾驶舱',
  },
  {
    id: 'import-export',
    title: '导入导出中心',
    group: '通用能力',
    description: '模板下载、导入校验、错误回写、异步导出和任务历史',
    kind: 'list',
    primaryAction: '新建导入任务',
  },
  {
    id: 'system-users',
    title: '用户与组织',
    group: '系统管理',
    description: '组织树、用户账号、状态、角色和登录审计',
    kind: 'admin',
    primaryAction: '新增用户',
  },
  {
    id: 'roles-permissions',
    title: '角色与权限',
    group: '系统管理',
    description: '菜单权限、操作权限、数据范围、字段级权限和文档权限',
    kind: 'admin',
    primaryAction: '复制角色',
  },
  {
    id: 'field-config',
    title: '字段与表单配置',
    group: '系统管理',
    description: '自定义字段、显示列、表单布局、选项集和校验规则',
    kind: 'admin',
    primaryAction: '新增字段',
  },
  {
    id: 'account-settings',
    title: '账户与偏好设置',
    group: '账户',
    description: '个人资料、登录口令、通知偏好、常用菜单和安全设备',
    kind: 'settings',
    primaryAction: '保存偏好',
  },
  {
    id: 'recycle-bin',
    title: '回收站',
    group: '系统管理',
    description: '文件、对象、恢复、彻底删除和操作审计',
    kind: 'recycle',
    primaryAction: '批量恢复',
  },
]

export const roles = [
  '管理合伙人',
  '投资经理',
  '基金运营',
  '风控法务',
  'IR 投资人关系',
  '研究员',
  '系统管理员',
  '只读审计',
]

export const projects: Project[] = [
  {
    name: '瀚云智造',
    company: '瀚云智能制造科技有限公司',
    stage: '入库',
    sector: '工业软件',
    city: '苏州',
    owner: '陈嘉',
    status: '观察中',
    fund: '成长一期',
    amount: 3200,
    risk: '低',
    nextStep: '补充财务模型',
  },
  {
    name: '矩阵医疗',
    company: '矩阵精准医疗股份有限公司',
    stage: '立项',
    sector: '医疗器械',
    city: '上海',
    owner: '林蔚',
    status: '待立项会',
    fund: '医疗专项',
    amount: 5800,
    risk: '中',
    nextStep: '安排专家访谈',
  },
  {
    name: '北辰储能',
    company: '北辰储能系统有限公司',
    stage: 'TS',
    sector: '新能源',
    city: '常州',
    owner: '周旻',
    status: '条款谈判',
    fund: '双碳基金',
    amount: 9000,
    risk: '中',
    nextStep: '更新 TS 条款',
  },
  {
    name: '澜舟机器人',
    company: '澜舟机器人科技有限公司',
    stage: '尽调',
    sector: '机器人',
    city: '深圳',
    owner: '沈思',
    status: '尽调中',
    fund: '成长一期',
    amount: 7200,
    risk: '低',
    nextStep: '法务底稿复核',
  },
  {
    name: '青穹芯片',
    company: '青穹半导体有限公司',
    stage: '内审',
    sector: '半导体',
    city: '南京',
    owner: '何璟',
    status: '内审排期',
    fund: '硬科技基金',
    amount: 12500,
    risk: '高',
    nextStep: '关联交易说明',
  },
  {
    name: '启明细胞',
    company: '启明细胞治疗有限公司',
    stage: '投决',
    sector: '生物医药',
    city: '北京',
    owner: '林蔚',
    status: '上会准备',
    fund: '医疗专项',
    amount: 15000,
    risk: '中',
    nextStep: '形成投决材料',
  },
  {
    name: '森合材料',
    company: '森合新材料有限公司',
    stage: '投资协议',
    sector: '新材料',
    city: '宁波',
    owner: '陈嘉',
    status: '协议修订',
    fund: '双碳基金',
    amount: 6600,
    risk: '低',
    nextStep: '签署补充协议',
  },
  {
    name: '远桥数据',
    company: '远桥数据基础设施有限公司',
    stage: '打款',
    sector: '企业服务',
    city: '杭州',
    owner: '沈思',
    status: '付款审批',
    fund: '成长二期',
    amount: 4800,
    risk: '中',
    nextStep: '完成托管复核',
  },
  {
    name: '星禾农业',
    company: '星禾农业科技有限公司',
    stage: '投后服务',
    sector: '农业科技',
    city: '成都',
    owner: '周旻',
    status: '投后跟踪',
    fund: '乡村振兴基金',
    amount: 3900,
    risk: '高',
    nextStep: '现金流风险复盘',
  },
]

export const funds: DataRow[] = [
  { 基金简称: '成长一期', 状态: '投资期', 募集方式: '私募', 认缴规模: '18.6 亿', 实缴总额: '15.2 亿', 累计投资: '9.8 亿', 已投企业: 18, 托管行: '招商银行' },
  { 基金简称: '成长二期', 状态: '募集期', 募集方式: '私募', 认缴规模: '25.0 亿', 实缴总额: '6.4 亿', 累计投资: '1.9 亿', 已投企业: 4, 托管行: '浦发银行' },
  { 基金简称: '医疗专项', 状态: '投资期', 募集方式: '专项', 认缴规模: '12.0 亿', 实缴总额: '10.7 亿', 累计投资: '7.1 亿', 已投企业: 11, 托管行: '中信银行' },
  { 基金简称: '双碳基金', 状态: '投资期', 募集方式: '引导基金', 认缴规模: '20.0 亿', 实缴总额: '13.3 亿', 累计投资: '8.4 亿', 已投企业: 13, 托管行: '建设银行' },
  { 基金简称: '硬科技基金', 状态: '退出期', 募集方式: '私募', 认缴规模: '16.5 亿', 实缴总额: '16.5 亿', 累计投资: '14.8 亿', 已投企业: 21, 托管行: '工商银行' },
]

export const investors: DataRow[] = [
  { 投资人: '华东产业母基金', 类型: '机构 LP', 认缴总额: '5.0 亿', 实缴总额: '4.2 亿', 联系人: '赵岚', 最近披露: '2026 Q2', 状态: '正常' },
  { 投资人: '长三角科技集团', 类型: '产业方', 认缴总额: '3.5 亿', 实缴总额: '3.1 亿', 联系人: '刘展', 最近披露: '2026 Q2', 状态: '待回执' },
  { 投资人: '未来成长家族办公室', 类型: '家办', 认缴总额: '1.2 亿', 实缴总额: '0.9 亿', 联系人: '何舟', 最近披露: '2026 Q1', 状态: '需跟进' },
  { 投资人: '海川资本', 类型: 'FOF', 认缴总额: '2.8 亿', 实缴总额: '2.8 亿', 联系人: '吴然', 最近披露: '2026 Q2', 状态: '正常' },
]

export const workflows: DataRow[] = [
  { 流程名称: '项目立项审批', 类别: '项目类', 当前节点: '投资总监复核', 关联对象: '矩阵医疗', 到期: '2026-07-05', 状态: '进行中' },
  { 流程名称: '尽调预算申请', 类别: '项目类', 当前节点: '财务审批', 关联对象: '澜舟机器人', 到期: '2026-07-04', 状态: '临期' },
  { 流程名称: '基金付款审批', 类别: '基金类', 当前节点: '托管复核', 关联对象: '远桥数据', 到期: '2026-07-03', 状态: '临期' },
  { 流程名称: 'LP 披露材料审批', 类别: '基金类', 当前节点: 'IR 复核', 关联对象: '成长一期', 到期: '2026-07-08', 状态: '进行中' },
  { 流程名称: '用印申请', 类别: 'OA', 当前节点: '法务审批', 关联对象: '投资协议补充页', 到期: '2026-07-02', 状态: '超期' },
]

export const documents: DataRow[] = [
  { 文件名: '矩阵医疗 BP.pdf', 类型: '项目文件', 关联对象: '矩阵医疗', 版本: 'v3', 权限: '项目组', 水印: '开启', 更新时间: '2026-06-29' },
  { 文件名: '成长一期 2026Q2 披露包.zip', 类型: '基金文件', 关联对象: '成长一期', 版本: 'v1', 权限: 'IR/运营', 水印: '开启', 更新时间: '2026-06-30' },
  { 文件名: '北辰储能 TS.docx', 类型: '流程文件', 关联对象: '北辰储能', 版本: 'v5', 权限: '法务', 水印: '开启', 更新时间: '2026-07-01' },
  { 文件名: '硬科技赛道周报.pptx', 类型: '共享文件', 关联对象: '行研智库', 版本: 'v2', 权限: '全员只读', 水印: '关闭', 更新时间: '2026-07-02' },
]

export const risks: DataRow[] = [
  { 风险事件: '星禾农业现金流低于安全线', 关联项目: '星禾农业', 等级: '高', 负责人: '周旻', 处置状态: '处理中', 提醒日: '2026-07-03' },
  { 风险事件: '青穹芯片关联交易披露不足', 关联项目: '青穹芯片', 等级: '高', 负责人: '何璟', 处置状态: '待补充', 提醒日: '2026-07-04' },
  { 风险事件: '矩阵医疗临床节点延期', 关联项目: '矩阵医疗', 等级: '中', 负责人: '林蔚', 处置状态: '跟踪中', 提醒日: '2026-07-08' },
  { 风险事件: '远桥数据回款进度偏慢', 关联项目: '远桥数据', 等级: '中', 负责人: '沈思', 处置状态: '已制定方案', 提醒日: '2026-07-10' },
]

export const announcements: DataRow[] = [
  { 标题: '投后月报填报窗口开放', 发布人: '基金运营', 范围: '项目负责人', 阅读率: '86%', 状态: '已发布', 发布时间: '2026-07-01' },
  { 标题: 'Q2 投委会材料归档提醒', 发布人: '风控法务', 范围: '投资团队', 阅读率: '72%', 状态: '已发布', 发布时间: '2026-06-30' },
  { 标题: '新字段权限矩阵试运行', 发布人: '系统管理员', 范围: '全员', 阅读率: '64%', 状态: '草稿', 发布时间: '2026-06-28' },
]

export const calendarEvents: DataRow[] = [
  { 日程: '启明细胞投决会', 类型: '投决会', 关联对象: '启明细胞', 参与人: '投委会', 时间: '2026-07-06 14:00', 冲突: '无' },
  { 日程: '澜舟机器人法务尽调', 类型: '尽调', 关联对象: '澜舟机器人', 参与人: '法务/投资', 时间: '2026-07-04 10:30', 冲突: '会议室冲突' },
  { 日程: '成长一期 LP 例会', 类型: 'LP 披露', 关联对象: '成长一期', 参与人: 'IR/运营', 时间: '2026-07-09 16:00', 冲突: '无' },
]

export const messages: DataRow[] = [
  { 类型: '流程待办', 标题: '远桥数据付款审批待处理', 优先级: '高', 来源: '流程中心', 时间: '2026-07-02 09:12', 状态: '未读' },
  { 类型: '风险提醒', 标题: '星禾农业现金流触发预警', 优先级: '高', 来源: '风险管理', 时间: '2026-07-02 08:30', 状态: '未读' },
  { 类型: '抄送', 标题: '北辰储能 TS 条款更新', 优先级: '中', 来源: '项目管理', 时间: '2026-07-01 18:20', 状态: '已读' },
]

export const investments: DataRow[] = [
  { 项目名称: '澜舟机器人', 投资主体: '成长一期', 协议金额: '7,200 万', 累计打款: '5,400 万', 最新持股: '7.8%', 最新估值: '9.2 亿', 退出状态: '未退出' },
  { 项目名称: '北辰储能', 投资主体: '双碳基金', 协议金额: '9,000 万', 累计打款: '4,500 万', 最新持股: '6.2%', 最新估值: '14.5 亿', 退出状态: '未退出' },
  { 项目名称: '森合材料', 投资主体: '双碳基金', 协议金额: '6,600 万', 累计打款: '6,600 万', 最新持股: '5.4%', 最新估值: '12.1 亿', 退出状态: '未退出' },
]

export const equityChanges: DataRow[] = [
  { 项目名称: '北辰储能', 投资主体: '双碳基金', 变更原因: 'B 轮增资', 协议时间: '2026-06-18', 轮次: 'B 轮', 领投: '是', 交易前股比: '4.1%', 交易后股比: '6.2%' },
  { 项目名称: '矩阵医疗', 投资主体: '医疗专项', 变更原因: '老股转让', 协议时间: '2026-06-24', 轮次: 'C 轮', 领投: '否', 交易前股比: '0%', 交易后股比: '3.6%' },
  { 项目名称: '澜舟机器人', 投资主体: '成长一期', 变更原因: '跟投增资', 协议时间: '2026-07-01', 轮次: 'A+ 轮', 领投: '否', 交易前股比: '5.9%', 交易后股比: '7.8%' },
]

export const researchRows: DataRow[] = [
  { 标题: '具身智能供应链季度跟踪', 行业: '机器人', 标签: '传感器/控制器', 来源: '内部访谈', 关联项目: '澜舟机器人', 更新时间: '2026-07-01' },
  { 标题: '储能系统集成毛利拆解', 行业: '新能源', 标签: '储能/电芯', 来源: '专家纪要', 关联项目: '北辰储能', 更新时间: '2026-06-27' },
  { 标题: 'AI 医疗器械注册路径', 行业: '医疗器械', 标签: '注册/临床', 来源: '行业报告', 关联项目: '矩阵医疗', 更新时间: '2026-06-25' },
]

export const importJobs: DataRow[] = [
  { 任务名称: '项目主档批量导入', 模块: '项目管理', 发起人: '陈嘉', 状态: '校验失败', 成功: 43, 失败: 6, 创建时间: '2026-07-02 09:30' },
  { 任务名称: '基金现金流导出', 模块: '基金管理', 发起人: '基金运营', 状态: '已完成', 成功: 1, 失败: 0, 创建时间: '2026-07-01 17:12' },
  { 任务名称: 'LP 披露清单导入', 模块: '投资人', 发起人: 'IR', 状态: '处理中', 成功: 0, 失败: 0, 创建时间: '2026-07-02 10:15' },
]

export const users: DataRow[] = [
  { 姓名: '陈嘉', 部门: '投资一部', 角色: '投资经理', 状态: '启用', 最近登录: '2026-07-02 09:50', 数据范围: '本人及协作项目' },
  { 姓名: '林蔚', 部门: '医疗组', 角色: '投资经理', 状态: '启用', 最近登录: '2026-07-02 08:41', 数据范围: '医疗专项' },
  { 姓名: '赵岚', 部门: 'IR', 角色: 'IR 投资人关系', 状态: '启用', 最近登录: '2026-07-01 18:10', 数据范围: 'LP 数据' },
  { 姓名: '审计访客', 部门: '外部审计', 角色: '只读审计', 状态: '限时', 最近登录: '2026-06-30 13:05', 数据范围: '脱敏只读' },
]

export const permissions: DataRow[] = [
  { 资源: '项目管理', 查看: '允许', 新增: '允许', 编辑: '本人项目', 删除: '禁止', 导出: '审批后', 数据范围: '部门' },
  { 资源: '基金管理', 查看: '允许', 新增: '运营', 编辑: '运营', 删除: '禁止', 导出: '审批后', 数据范围: '基金' },
  { 资源: '文档中心', 查看: '按密级', 新增: '允许', 编辑: '所有人', 删除: '审批后', 导出: '二次鉴权', 数据范围: '授权对象' },
  { 资源: '系统管理', 查看: '管理员', 新增: '管理员', 编辑: '管理员', 删除: '管理员', 导出: '禁止', 数据范围: '全局' },
]

export const customFields: DataRow[] = [
  { 字段名称: 'ESG 评级', 所属对象: '项目', 类型: '选项', 必填: '否', 权限: '投资/投后可见', 发布状态: '已发布' },
  { 字段名称: '国资备案编号', 所属对象: '基金', 类型: '文本', 必填: '是', 权限: '基金运营可编辑', 发布状态: '草稿' },
  { 字段名称: '二次鉴权级别', 所属对象: '文档', 类型: '选项', 必填: '是', 权限: '管理员', 发布状态: '已发布' },
]

export const recycleRows: DataRow[] = [
  { 对象: '矩阵医疗旧版 BP.pdf', 类型: '文件', 删除人: '陈嘉', 删除时间: '2026-06-25', 保留到期: '2026-07-25', 状态: '可恢复' },
  { 对象: '成长一期过期披露任务', 类型: '流程', 删除人: '系统管理员', 删除时间: '2026-06-20', 保留到期: '2026-07-20', 状态: '可恢复' },
  { 对象: '临时字段-投资偏好', 类型: '字段配置', 删除人: '系统管理员', 删除时间: '2026-06-12', 保留到期: '2026-07-12', 状态: '即将到期' },
]

export const cashflows: DataRow[] = [
  { 日期: '2026-06-28', 类型: '投资人实缴', 对象: '华东产业母基金', 金额: '+8,000 万', 币种: 'CNY', 状态: '已确认' },
  { 日期: '2026-06-30', 类型: '项目打款', 对象: '远桥数据', 金额: '-2,400 万', 币种: 'CNY', 状态: '待托管复核' },
  { 日期: '2026-07-01', 类型: '项目回款', 对象: '森合材料', 金额: '+1,260 万', 币种: 'CNY', 状态: '待分配' },
]

export const financialRows: DataRow[] = [
  { 期间: '2026 Q2', 基金净资产: '16.8 亿', 单位净值: '1.1862', 累计投资: '9.8 亿', 累计回款: '2.1 亿', DPI: '0.22', TVPI: '1.31' },
  { 期间: '2026 Q1', 基金净资产: '15.9 亿', 单位净值: '1.1425', 累计投资: '9.1 亿', 累计回款: '1.7 亿', DPI: '0.18', TVPI: '1.26' },
  { 期间: '2025 Q4', 基金净资产: '14.6 亿', 单位净值: '1.0980', 累计投资: '8.3 亿', 累计回款: '1.1 亿', DPI: '0.12', TVPI: '1.19' },
]

export const postDataRows: DataRow[] = [
  { 期间: '2026-06', 项目: '星禾农业', 营收: '1,120 万', 净利润: '-90 万', 现金余额: '740 万', 员工数: 86, 估值: '4.8 亿', 状态: '已回流' },
  { 期间: '2026-06', 项目: '澜舟机器人', 营收: '2,860 万', 净利润: '320 万', 现金余额: '6,300 万', 员工数: 214, 估值: '9.2 亿', 状态: '已回流' },
  { 期间: '2026-06', 项目: '矩阵医疗', 营收: '780 万', 净利润: '-210 万', 现金余额: '3,400 万', 员工数: 132, 估值: '11.0 亿', 状态: '待确认' },
]

export const managementOrgs: DataRow[] = [
  { 机构名称: '天启私募基金管理有限公司', 机构类型: '基金管理人', 信用代码: '9131****8821', 管理基金数: 5, 联系人: '顾言', 状态: '正常' },
  { 机构名称: '成长一期 GP 合伙企业', 机构类型: '普通合伙人', 信用代码: '9132****1097', 管理基金数: 1, 联系人: '赵临', 状态: '正常' },
  { 机构名称: '双碳基金执行事务合伙人', 机构类型: '执行事务合伙人', 信用代码: '9130****6729', 管理基金数: 1, 联系人: '邱宁', 状态: '年检中' },
]

export const dashboardMetrics = [
  { label: '在管基金规模', value: '92.1 亿', trend: '+7.8%', tone: 'blue' },
  { label: '项目储备', value: '128', trend: '+12', tone: 'green' },
  { label: '待办审批', value: '34', trend: '9 临期', tone: 'amber' },
  { label: '高风险事项', value: '6', trend: '+2', tone: 'red' },
]

export const stageNames = ['入库', '立项', 'TS', '尽调', '内审', '投决', '投资协议', '打款', '投后服务']

// 工作台「项目阶段分布」漏斗(概览统计,比按 mock 逐条 count 更真实:早期宽、末期是累计投后)。
export const pipelineDistribution: Array<{ stage: string; count: number }> = [
  { stage: '入库', count: 24 },
  { stage: '立项', count: 17 },
  { stage: 'TS', count: 13 },
  { stage: '尽调', count: 11 },
  { stage: '内审', count: 7 },
  { stage: '投决', count: 5 },
  { stage: '投资协议', count: 4 },
  { stage: '打款', count: 3 },
  { stage: '投后服务', count: 21 },
]

export const chartSeries = [42, 64, 58, 82, 73, 91, 76, 88, 96, 84, 102, 118]
