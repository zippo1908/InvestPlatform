from __future__ import annotations

import os
import uuid
from datetime import datetime
from json import dumps
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    import pymysql
except Exception:  # pragma: no cover - dependency is installed by deploy.sh
    pymysql = None


APP_NAME = "CapitalOS Backend"
APP_VERSION = "1.0.0"


class LoginPayload(BaseModel):
    account: str
    password: str


class GenericActionPayload(BaseModel):
    action: str
    entity_type: str
    entity_id: int | None = None
    entity_label: str | None = None
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    risk_level: str = "low"


class CreateProjectPayload(BaseModel):
    short_name: str
    legal_name: str | None = None
    industry_group: str = "Enterprise Software"
    city: str = "Shanghai"
    summary: str | None = None


class CreateFundPayload(BaseModel):
    fund_name: str
    legal_name: str | None = None
    target_size: float = 100000000
    committed_size: float = 0
    paid_in_size: float = 0
    fund_status: str = "planning"


class CreateDocumentPayload(BaseModel):
    title: str
    document_kind: str = "shared"
    file_name: str = "frontend-upload-placeholder.pdf"
    storage_uri: str = "mock://documents/frontend-upload-placeholder.pdf"
    file_size_bytes: int = 1024


class StartWorkflowPayload(BaseModel):
    title: str
    workflow_family: str = "project"
    payload: dict[str, Any] | None = None


class WorkflowActionPayload(BaseModel):
    action: str
    comment: str | None = None


class RiskUpdatePayload(BaseModel):
    update_text: str
    update_status: str = "progress"


class ImportExportPayload(BaseModel):
    task_kind: str
    entity_type: str
    source_file_uri: str | None = None


class PreferencePayload(BaseModel):
    notification_json: dict[str, Any] | None = None
    favorite_nav_json: list[str] | None = None
    table_view_json: dict[str, Any] | None = None


SCREENS: list[dict[str, str]] = [
    {"id": "login", "title": "Login", "group": "Entry"},
    {"id": "workbench", "title": "Executive Workbench", "group": "Workspace"},
    {"id": "ai-workspace", "title": "AI Workspace", "group": "Workspace"},
    {"id": "announcements", "title": "Announcements", "group": "Collaboration"},
    {"id": "calendar", "title": "Calendar", "group": "Collaboration"},
    {"id": "message-center", "title": "Message Center", "group": "Collaboration"},
    {"id": "flow-center", "title": "Workflow Center", "group": "Workflow"},
    {"id": "flow-project", "title": "Project Workflows", "group": "Workflow"},
    {"id": "flow-fund", "title": "Fund Workflows", "group": "Workflow"},
    {"id": "flow-oa", "title": "Office Workflows", "group": "Workflow"},
    {"id": "project-board", "title": "Project Board", "group": "Projects"},
    {"id": "project-list", "title": "Project List", "group": "Projects"},
    {"id": "project-add", "title": "Add Project", "group": "Projects"},
    {"id": "project-detail-overview", "title": "Project Detail Overview", "group": "Projects"},
    {"id": "project-detail-investment", "title": "Project Investment Relation", "group": "Projects"},
    {"id": "project-detail-postdata", "title": "Project Post Data", "group": "Projects"},
    {"id": "meeting-ai", "title": "Meeting AI", "group": "Projects"},
    {"id": "fund-list", "title": "Fund List", "group": "Funds"},
    {"id": "fund-add", "title": "Add Fund", "group": "Funds"},
    {"id": "fund-detail-overview", "title": "Fund Detail Overview", "group": "Funds"},
    {"id": "fund-detail-cashflow", "title": "Fund Cashflow", "group": "Funds"},
    {"id": "fund-detail-financials", "title": "Fund Financials", "group": "Funds"},
    {"id": "investment-info", "title": "Investment Ledger", "group": "Funds"},
    {"id": "equity-change", "title": "Equity Change", "group": "Funds"},
    {"id": "investor-list", "title": "Investor List", "group": "Investors"},
    {"id": "investor-detail", "title": "Investor Detail", "group": "Investors"},
    {"id": "manager-orgs", "title": "Management Organizations", "group": "Investors"},
    {"id": "post-data-collection", "title": "Post Data Collection", "group": "Portfolio"},
    {"id": "risk-clauses", "title": "Key Clauses", "group": "Risk"},
    {"id": "burst-risk", "title": "Risk Incidents", "group": "Risk"},
    {"id": "document-center", "title": "Document Center", "group": "Documents"},
    {"id": "process-files", "title": "Workflow Files", "group": "Documents"},
    {"id": "research-library", "title": "Research Library", "group": "AI Data"},
    {"id": "internal-research", "title": "Internal Research", "group": "AI Data"},
    {"id": "report-dashboard", "title": "Report Dashboard", "group": "Reports"},
    {"id": "import-export", "title": "Import Export Center", "group": "Common"},
    {"id": "system-users", "title": "Users And Organizations", "group": "System"},
    {"id": "roles-permissions", "title": "Roles And Permissions", "group": "System"},
    {"id": "field-config", "title": "Fields And Forms", "group": "System"},
    {"id": "account-settings", "title": "Account Settings", "group": "Account"},
    {"id": "recycle-bin", "title": "Recycle Bin", "group": "System"},
]

PROJECTS: list[dict[str, Any]] = [
    {
        "id": 1,
        "name": "Matrix Medical",
        "stage": "Project Approval",
        "sector": "Medical Devices",
        "city": "Shanghai",
        "owner": "Nina Lin",
        "risk": "medium",
        "next_step": "Prepare IC material",
    },
    {
        "id": 2,
        "name": "Northstar Storage",
        "stage": "TS",
        "sector": "Energy Storage",
        "city": "Changzhou",
        "owner": "Nina Lin",
        "risk": "medium",
        "next_step": "Update TS clauses",
    },
    {
        "id": 3,
        "name": "Lanzhou Robotics",
        "stage": "Diligence",
        "sector": "Robotics",
        "city": "Shenzhen",
        "owner": "Nina Lin",
        "risk": "low",
        "next_step": "Finish legal checklist",
    },
]

FUNDS: list[dict[str, Any]] = [
    {"id": 1, "name": "Growth Fund I", "status": "investing", "committed_size": 1860000000, "tvpi": 1.31},
    {"id": 2, "name": "Carbon Fund I", "status": "investing", "committed_size": 2000000000, "tvpi": 1.12},
    {"id": 3, "name": "Healthcare Special Fund", "status": "investing", "committed_size": 1200000000, "tvpi": 1.10},
]

RISKS: list[dict[str, Any]] = [
    {"id": 1, "title": "Cash balance below safety line", "project": "Starfield Agri", "severity": "high"},
    {"id": 2, "title": "Related-party disclosure incomplete", "project": "Qingqiong Chip", "severity": "high"},
    {"id": 3, "title": "Clinical milestone delay", "project": "Matrix Medical", "severity": "medium"},
]

LEDGER_QUERIES: dict[str, str] = {
    "announcements": """
        SELECT title AS '标题', publish_status AS '状态', published_at AS '发布时间',
               expires_at AS '到期时间', created_at AS '创建时间'
        FROM cap_announcements
        WHERE deleted_at IS NULL
        ORDER BY announcement_id DESC
        LIMIT 100
    """,
    "calendar": """
        SELECT event_title AS '日程', event_kind AS '类型', linked_entity_type AS '关联类型',
               starts_at AS '开始时间', ends_at AS '结束时间', location_text AS '地点',
               visibility AS '可见范围'
        FROM cap_calendar_events
        WHERE deleted_at IS NULL
        ORDER BY starts_at DESC
        LIMIT 100
    """,
    "message-center": """
        SELECT source_kind AS '类型', title AS '标题', message_box AS '收件箱',
               action_status AS '处理状态', created_at AS '创建时间'
        FROM cap_messages
        ORDER BY message_id DESC
        LIMIT 100
    """,
    "project-list": """
        SELECT p.short_name AS '项目名称', p.stage_label AS '阶段', p.opportunity_status AS '状态',
               COALESCE(u.display_name, '-') AS '负责人', p.city AS '城市',
               p.industry_group AS '行业方向', p.updated_at AS '更新时间'
        FROM cap_projects p
        LEFT JOIN cap_users u ON u.user_id=p.owner_user_id
        WHERE p.deleted_at IS NULL
        ORDER BY p.project_id DESC
        LIMIT 100
    """,
    "fund-list": """
        SELECT f.fund_name AS '基金简称', f.fund_status AS '状态', f.raise_method AS '募集方式',
               f.committed_size AS '认缴规模', f.paid_in_size AS '实缴总额',
               f.net_asset_value AS '净资产', f.unit_nav AS '单位净值',
               COALESCE(m.org_name, '-') AS '管理人'
        FROM cap_funds f
        LEFT JOIN cap_management_orgs m ON m.management_org_id=f.manager_org_id
        WHERE f.deleted_at IS NULL
        ORDER BY f.fund_id DESC
        LIMIT 100
    """,
    "investment-info": """
        SELECT COALESCE(p.short_name, '-') AS '项目名称', COALESCE(f.fund_name, '-') AS '投资主体',
               i.round_label AS '轮次', i.agreement_amount AS '协议金额',
               i.paid_amount AS '累计打款', i.shareholding_pct AS '最新持股',
               i.position_status AS '状态'
        FROM cap_investment_positions i
        LEFT JOIN cap_projects p ON p.project_id=i.project_id
        LEFT JOIN cap_funds f ON f.fund_id=i.fund_id
        ORDER BY i.investment_position_id DESC
        LIMIT 100
    """,
    "equity-change": """
        SELECT COALESCE(p.short_name, '-') AS '项目名称', e.change_reason AS '变更原因',
               e.round_label AS '轮次', e.before_pct AS '交易前股比',
               e.after_pct AS '交易后股比', e.signed_on AS '协议时间',
               e.created_at AS '创建时间'
        FROM cap_equity_changes e
        LEFT JOIN cap_projects p ON p.project_id=e.project_id
        ORDER BY e.equity_change_id DESC
        LIMIT 100
    """,
    "investor-list": """
        SELECT investor_name AS '投资人', investor_kind AS '类型', qualification_status AS '适当性',
               risk_rating AS '风险评级', city AS '城市', disclosure_status AS '披露状态',
               updated_at AS '更新时间'
        FROM cap_investors
        WHERE deleted_at IS NULL
        ORDER BY investor_id DESC
        LIMIT 100
    """,
    "manager-orgs": """
        SELECT org_name AS '机构名称', org_kind AS '类型', city AS '城市',
               contact_name AS '联系人', status AS '状态', updated_at AS '更新时间'
        FROM cap_management_orgs
        WHERE deleted_at IS NULL
        ORDER BY management_org_id DESC
        LIMIT 100
    """,
    "post-data-collection": """
        SELECT campaign_name AS '收集任务', period_code AS '期间', status AS '状态',
               due_on AS '截止日期', frequency AS '频率', send_mode AS '发送方式',
               created_at AS '创建时间'
        FROM cap_data_collection_campaigns
        ORDER BY collection_campaign_id DESC
        LIMIT 100
    """,
    "research-library": """
        SELECT note_title AS '标题', note_kind AS '类型', source_name AS '来源',
               review_status AS '状态', updated_at AS '更新时间'
        FROM cap_research_notes
        WHERE deleted_at IS NULL
        ORDER BY research_note_id DESC
        LIMIT 100
    """,
    "internal-research": """
        SELECT note_title AS '标题', note_kind AS '类型', source_name AS '来源',
               review_status AS '状态', updated_at AS '更新时间'
        FROM cap_research_notes
        WHERE deleted_at IS NULL
        ORDER BY research_note_id DESC
        LIMIT 100
    """,
    "import-export": """
        SELECT task_code AS '任务编号', task_kind AS '类型', entity_type AS '模块',
               task_status AS '状态', total_rows AS '总行数', success_rows AS '成功',
               failed_rows AS '失败', requested_at AS '创建时间'
        FROM cap_import_export_tasks
        ORDER BY import_export_task_id DESC
        LIMIT 100
    """,
    "system-users": """
        SELECT u.display_name AS '姓名', COALESCE(o.org_name, '-') AS '部门',
               u.login_name AS '账号', u.email AS '邮箱', u.account_status AS '状态',
               u.last_login_at AS '最近登录'
        FROM cap_users u
        LEFT JOIN cap_organizations o ON o.org_id=u.org_id
        WHERE u.deleted_at IS NULL
        ORDER BY u.user_id DESC
        LIMIT 100
    """,
    "roles-permissions": """
        SELECT role_name AS '角色', data_scope AS '数据范围', is_system_role AS '系统角色',
               description AS '描述', updated_at AS '更新时间'
        FROM cap_roles
        ORDER BY role_id DESC
        LIMIT 100
    """,
    "field-config": """
        SELECT entity_type AS '所属对象', field_label AS '字段名称', data_type AS '类型',
               is_required AS '必填', is_searchable AS '可搜索', display_order AS '排序',
               updated_at AS '更新时间'
        FROM cap_custom_field_definitions
        WHERE deleted_at IS NULL
        ORDER BY entity_type, display_order
        LIMIT 100
    """,
    "recycle-bin": """
        SELECT object_label AS '对象', object_type AS '类型', delete_reason AS '删除原因',
               purge_status AS '状态', deleted_at AS '删除时间',
               recoverable_until AS '保留到期'
        FROM cap_recycle_items
        ORDER BY recycle_item_id DESC
        LIMIT 100
    """,
}


app = FastAPI(title=APP_NAME, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def db_config() -> dict[str, Any]:
    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    database = os.getenv("DB_NAME", "capitalos")
    port = int(os.getenv("DB_PORT", "3306"))

    if not host or not user or password is None:
        raise HTTPException(status_code=400, detail="DB_HOST, DB_USER and DB_PASSWORD are required")

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "database": database,
        "charset": "utf8mb4",
        "cursorclass": pymysql.cursors.DictCursor,
        "connect_timeout": 5,
        "autocommit": False,
    }


def connect_db():
    if pymysql is None:
        raise HTTPException(status_code=500, detail="pymysql is not installed")
    return pymysql.connect(**db_config())


def write_audit(
    cursor: Any,
    actor_user_id: int | None,
    action_code: str,
    entity_type: str,
    entity_id: int | None,
    entity_label: str | None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    risk_level: str = "low",
) -> int:
    cursor.execute(
        """
        INSERT INTO cap_audit_logs
          (actor_user_id, action_code, entity_type, entity_id, entity_label, request_id, ip_mask,
           before_json, after_json, risk_level, occurred_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            actor_user_id,
            action_code,
            entity_type,
            entity_id,
            entity_label,
            f"REQ-{uuid.uuid4().hex[:12]}",
            "api-client",
            dumps(before or {}, ensure_ascii=False),
            dumps(after or {}, ensure_ascii=False),
            risk_level,
            datetime.now(),
        ),
    )
    return int(cursor.lastrowid)


def ensure_ui_action_table(cursor: Any) -> None:
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cap_ui_action_events (
          ui_action_event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          audit_log_id BIGINT UNSIGNED NULL,
          actor_user_id BIGINT UNSIGNED NULL,
          action_code VARCHAR(120) NOT NULL,
          entity_type VARCHAR(80) NOT NULL,
          entity_id BIGINT UNSIGNED NULL,
          entity_label VARCHAR(220) NULL,
          payload_json JSON NULL,
          result_json JSON NULL,
          event_status ENUM('succeeded','failed') NOT NULL DEFAULT 'succeeded',
          occurred_at DATETIME NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (ui_action_event_id),
          KEY idx_cap_ui_action_audit (audit_log_id),
          KEY idx_cap_ui_action_actor_time (actor_user_id, occurred_at),
          KEY idx_cap_ui_action_code (action_code),
          CONSTRAINT fk_cap_ui_action_audit
            FOREIGN KEY (audit_log_id) REFERENCES cap_audit_logs (audit_log_id)
            ON DELETE SET NULL,
          CONSTRAINT fk_cap_ui_action_actor
            FOREIGN KEY (actor_user_id) REFERENCES cap_users (user_id)
            ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def write_ui_action_event(
    cursor: Any,
    actor_user_id: int | None,
    audit_id: int | None,
    payload: GenericActionPayload,
    result: dict[str, Any],
) -> int:
    ensure_ui_action_table(cursor)
    cursor.execute(
        """
        INSERT INTO cap_ui_action_events
          (audit_log_id, actor_user_id, action_code, entity_type, entity_id, entity_label,
           payload_json, result_json, event_status, occurred_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'succeeded', %s)
        """,
        (
            audit_id,
            actor_user_id,
            payload.action,
            payload.entity_type,
            payload.entity_id,
            payload.entity_label,
            dumps(payload.model_dump(), ensure_ascii=False),
            dumps(result, ensure_ascii=False),
            datetime.now(),
        ),
    )
    return int(cursor.lastrowid)


def create_fund_record(cursor: Any, payload: CreateFundPayload, actor_user_id: int | None) -> dict[str, Any]:
    allowed_status = {"planning", "raising", "investing", "harvesting", "extended", "closed"}
    status = payload.fund_status if payload.fund_status in allowed_status else "planning"
    cursor.execute(
        """
        INSERT INTO cap_funds
          (fund_code, fund_name, legal_name, fund_status, raise_method, base_currency,
           target_size, committed_size, paid_in_size, net_asset_value, created_by)
        VALUES (%s, %s, %s, %s, 'private', 'CNY', %s, %s, %s, %s, %s)
        """,
        (
            f"FUN-API-{uuid.uuid4().hex[:8].upper()}",
            payload.fund_name,
            payload.legal_name or payload.fund_name,
            status,
            payload.target_size,
            payload.committed_size,
            payload.paid_in_size,
            payload.paid_in_size,
            actor_user_id,
        ),
    )
    fund_id = int(cursor.lastrowid)
    audit_id = write_audit(
        cursor,
        actor_user_id,
        "fund.create",
        "fund",
        fund_id,
        payload.fund_name,
        after=payload.model_dump(),
    )
    return {"ok": True, "fund_id": fund_id, "audit_id": audit_id, "affected_table": "cap_funds"}


def create_document_record(cursor: Any, payload: CreateDocumentPayload, actor_user_id: int | None) -> dict[str, Any]:
    allowed_kinds = {"project", "fund", "investor", "workflow", "shared", "meeting", "risk", "research", "other"}
    document_kind = payload.document_kind if payload.document_kind in allowed_kinds else "shared"
    cursor.execute(
        """
        INSERT INTO cap_documents
          (document_code, title, document_kind, storage_uri, file_name, mime_type,
           file_size_bytes, current_version_no, access_level, watermark_policy,
           fulltext_status, uploaded_by)
        VALUES (%s, %s, %s, %s, %s, 'application/pdf', %s, 1, 'team', 'viewer', 'queued', %s)
        """,
        (
            f"DOC-API-{uuid.uuid4().hex[:8].upper()}",
            payload.title,
            document_kind,
            payload.storage_uri,
            payload.file_name,
            payload.file_size_bytes,
            actor_user_id,
        ),
    )
    document_id = int(cursor.lastrowid)
    cursor.execute(
        """
        INSERT INTO cap_document_versions
          (document_id, version_no, storage_uri, file_size_bytes, checksum_hash, change_note, uploaded_by, uploaded_at)
        VALUES (%s, 1, %s, %s, %s, 'Initial frontend upload', %s, %s)
        """,
        (
            document_id,
            payload.storage_uri,
            payload.file_size_bytes,
            uuid.uuid4().hex,
            actor_user_id,
            datetime.now(),
        ),
    )
    version_id = int(cursor.lastrowid)
    cursor.execute(
        """
        INSERT INTO cap_document_permissions
          (document_id, grantee_kind, grantee_id, can_preview, can_download, can_edit,
           can_delete, can_share, watermark_required, granted_by)
        VALUES (%s, 'user', %s, 1, 1, 1, 0, 1, 1, %s)
        """,
        (document_id, actor_user_id or 1, actor_user_id),
    )
    audit_id = write_audit(
        cursor,
        actor_user_id,
        "document.upload",
        "document",
        document_id,
        payload.title,
        after=payload.model_dump(),
    )
    return {
        "ok": True,
        "document_id": document_id,
        "version_id": version_id,
        "audit_id": audit_id,
        "affected_table": "cap_documents",
    }


def start_workflow_record(cursor: Any, payload: StartWorkflowPayload, actor_user_id: int | None) -> dict[str, Any]:
    family = payload.workflow_family if payload.workflow_family in {"project", "fund", "office"} else "project"
    cursor.execute(
        """
        SELECT workflow_template_id, template_name
        FROM cap_workflow_templates
        WHERE workflow_family=%s
        ORDER BY workflow_template_id
        LIMIT 1
        """,
        (family,),
    )
    template = cursor.fetchone()
    if template is None:
        cursor.execute("SELECT workflow_template_id, template_name FROM cap_workflow_templates ORDER BY workflow_template_id LIMIT 1")
        template = cursor.fetchone()
    if template is None:
        raise HTTPException(status_code=400, detail="No workflow template exists")

    cursor.execute(
        """
        INSERT INTO cap_workflow_instances
          (workflow_template_id, instance_code, title, initiator_user_id, instance_status,
           current_step_key, payload_json, started_at)
        VALUES (%s, %s, %s, %s, 'running', 'start', %s, %s)
        """,
        (
            template["workflow_template_id"],
            f"WF-API-{uuid.uuid4().hex[:8].upper()}",
            payload.title,
            actor_user_id,
            dumps(payload.payload or {}, ensure_ascii=False),
            datetime.now(),
        ),
    )
    instance_id = int(cursor.lastrowid)
    cursor.execute(
        """
        INSERT INTO cap_workflow_tasks
          (workflow_instance_id, workflow_step_id, task_code, task_name, assigned_user_id, task_status, due_at)
        VALUES (%s, NULL, %s, %s, %s, 'pending', %s)
        """,
        (
            instance_id,
            f"WFT-API-{uuid.uuid4().hex[:8].upper()}",
            f"{template['template_name']}首节点审批",
            actor_user_id,
            datetime.now(),
        ),
    )
    task_id = int(cursor.lastrowid)
    audit_id = write_audit(
        cursor,
        actor_user_id,
        "workflow.start",
        "workflow_instance",
        instance_id,
        payload.title,
        after={"workflow_family": family, "task_id": task_id, "payload": payload.payload or {}},
    )
    return {
        "ok": True,
        "workflow_instance_id": instance_id,
        "task_id": task_id,
        "audit_id": audit_id,
        "affected_table": "cap_workflow_instances",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "app": APP_NAME,
        "version": APP_VERSION,
        "python": "3.12-required",
    }


@app.post("/api/auth/login")
def login(payload: LoginPayload) -> dict[str, Any]:
    if not payload.account.strip() or len(payload.password) < 4:
        raise HTTPException(status_code=400, detail="Invalid demo credentials")

    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT user_id, login_name, display_name FROM cap_users WHERE login_name=%s LIMIT 1",
                (payload.account,),
            )
            user = cursor.fetchone()
            if user is None:
                user = {"user_id": 1, "login_name": payload.account, "display_name": "Demo User"}

            cursor.execute(
                """
                INSERT INTO cap_login_events
                  (user_id, login_name, auth_method, outcome, ip_mask, device_label, risk_level, occurred_at)
                VALUES (%s, %s, 'password', 'success', 'api-client', 'deploy frontend', 'low', %s)
                """,
                (user["user_id"], payload.account, datetime.now()),
            )
            audit_id = write_audit(
                cursor,
                int(user["user_id"]),
                "auth.login",
                "user",
                int(user["user_id"]),
                str(user["display_name"]),
                after={"account": payload.account, "outcome": "success"},
            )
        connection.commit()
    finally:
        connection.close()

    return {
        "token": "demo-session-token",
        "audit_id": audit_id,
        "user": {
            "id": user["user_id"],
            "account": payload.account,
            "display_name": user["display_name"],
            "roles": ["managing_partner"],
        },
    }


@app.get("/api/screens")
def screens() -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT screen_code AS id, item_name AS title, group_name AS `group`, route_key
                FROM cap_navigation_items
                WHERE is_visible=1
                ORDER BY sort_order
                """
            )
            rows = cursor.fetchall()
    finally:
        connection.close()
    return {"count": len(rows), "items": rows}


@app.get("/api/dashboard")
def dashboard() -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS count FROM cap_projects WHERE deleted_at IS NULL")
            project_count = cursor.fetchone()["count"]
            cursor.execute("SELECT COALESCE(SUM(committed_size),0) AS aum FROM cap_funds WHERE deleted_at IS NULL")
            fund_aum = cursor.fetchone()["aum"]
            cursor.execute("SELECT COUNT(*) AS count FROM cap_workflow_tasks WHERE task_status='pending'")
            pending_tasks = cursor.fetchone()["count"]
            cursor.execute("SELECT COUNT(*) AS count FROM cap_risk_incidents WHERE severity IN ('high','critical') AND deleted_at IS NULL")
            high_risk = cursor.fetchone()["count"]
    finally:
        connection.close()

    return {
        "metrics": {
            "fund_aum": float(fund_aum),
            "project_reserve": project_count,
            "pending_tasks": pending_tasks,
            "high_risk": high_risk,
        }
    }


@app.get("/api/projects")
def list_projects() -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT p.project_id AS id, p.short_name AS name, p.stage_label AS stage,
                       p.industry_group AS sector, p.city, u.display_name AS owner,
                       p.opportunity_status AS status, p.summary, p.updated_at
                FROM cap_projects p
                LEFT JOIN cap_users u ON u.user_id=p.owner_user_id
                WHERE p.deleted_at IS NULL
                ORDER BY p.project_id DESC
                """
            )
            rows = cursor.fetchall()
    finally:
        connection.close()
    return {"count": len(rows), "items": rows}


@app.post("/api/projects")
def create_project(payload: CreateProjectPayload, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO cap_projects
                  (project_code, short_name, legal_name, opportunity_status, stage_label, industry_group,
                   city, registered_location, owner_user_id, source_channel, summary, thesis, product_note,
                   highlight_note, created_by)
                VALUES (%s, %s, %s, 'sourced', 'Sourced', %s, %s, %s, %s, 'API Create',
                        %s, 'API-created investment thesis pending review.', 'Product note pending.',
                        'Created from deploy backend.', %s)
                """,
                (
                    f"PRJ-API-{uuid.uuid4().hex[:8].upper()}",
                    payload.short_name,
                    payload.legal_name or payload.short_name,
                    payload.industry_group,
                    payload.city,
                    payload.city,
                    x_user_id,
                    payload.summary or "Created through real backend API.",
                    x_user_id,
                ),
            )
            project_id = int(cursor.lastrowid)
            cursor.execute(
                """
                INSERT INTO cap_project_stage_events
                  (project_id, from_stage, to_stage, event_reason, event_at, actor_user_id, notes)
                VALUES (%s, NULL, 'Sourced', 'Created through API', %s, %s, 'Initial API create')
                """,
                (project_id, datetime.now(), x_user_id),
            )
            audit_id = write_audit(
                cursor,
                x_user_id,
                "project.create",
                "project",
                project_id,
                payload.short_name,
                after=payload.model_dump(),
            )
        connection.commit()
    finally:
        connection.close()
    return {"ok": True, "project_id": project_id, "audit_id": audit_id}


@app.post("/api/projects/{project_id}/advance")
def advance_project(project_id: int, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    status_flow = [
        ("sourced", "screening", "Screening"),
        ("screening", "approved", "Project Approval"),
        ("approved", "term_sheet", "TS"),
        ("term_sheet", "diligence", "Diligence"),
        ("diligence", "committee", "IC"),
        ("committee", "agreement", "Agreement"),
        ("agreement", "funded", "Funded"),
        ("funded", "portfolio", "Post Investment"),
    ]
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT project_id, short_name, opportunity_status, stage_label FROM cap_projects WHERE project_id=%s", (project_id,))
            row = cursor.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Project not found")

            next_status = None
            next_stage = None
            for current_status, candidate_status, candidate_stage in status_flow:
                if row["opportunity_status"] == current_status:
                    next_status = candidate_status
                    next_stage = candidate_stage
                    break
            if next_status is None:
                next_status = row["opportunity_status"]
                next_stage = row["stage_label"]

            cursor.execute(
                "UPDATE cap_projects SET opportunity_status=%s, stage_label=%s WHERE project_id=%s",
                (next_status, next_stage, project_id),
            )
            cursor.execute(
                """
                INSERT INTO cap_project_stage_events
                  (project_id, from_stage, to_stage, event_reason, event_at, actor_user_id, notes)
                VALUES (%s, %s, %s, 'Advanced through API', %s, %s, 'Stage advanced from frontend action')
                """,
                (project_id, row["stage_label"], next_stage, datetime.now(), x_user_id),
            )
            audit_id = write_audit(
                cursor,
                x_user_id,
                "project.advance_stage",
                "project",
                project_id,
                row["short_name"],
                before={"stage": row["stage_label"]},
                after={"stage": next_stage},
            )
        connection.commit()
    finally:
        connection.close()
    return {"ok": True, "project_id": project_id, "stage": next_stage, "audit_id": audit_id}


@app.get("/api/funds")
def list_funds() -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT fund_id AS id, fund_name AS name, fund_status AS status,
                       committed_size, paid_in_size, net_asset_value, unit_nav
                FROM cap_funds
                WHERE deleted_at IS NULL
                ORDER BY fund_id
                """
            )
            rows = cursor.fetchall()
    finally:
        connection.close()
    return {"count": len(rows), "items": rows}


@app.post("/api/funds")
def create_fund(payload: CreateFundPayload, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            result = create_fund_record(cursor, payload, x_user_id)
        connection.commit()
    finally:
        connection.close()
    return result


@app.get("/api/risks")
def list_risks() -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT r.risk_incident_id AS id, r.incident_title AS title, r.severity,
                       r.incident_status AS status, r.latest_progress, p.short_name AS project
                FROM cap_risk_incidents r
                LEFT JOIN cap_projects p ON p.project_id=r.project_id
                WHERE r.deleted_at IS NULL
                ORDER BY r.risk_incident_id DESC
                """
            )
            rows = cursor.fetchall()
    finally:
        connection.close()
    return {"count": len(rows), "items": rows}


@app.post("/api/risks/{risk_incident_id}/updates")
def add_risk_update(
    risk_incident_id: int,
    payload: RiskUpdatePayload,
    x_user_id: int | None = Header(default=1),
) -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT incident_title FROM cap_risk_incidents WHERE risk_incident_id=%s", (risk_incident_id,))
            row = cursor.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Risk incident not found")
            cursor.execute(
                """
                INSERT INTO cap_risk_updates (risk_incident_id, update_text, update_status, created_by)
                VALUES (%s, %s, %s, %s)
                """,
                (risk_incident_id, payload.update_text, payload.update_status, x_user_id),
            )
            update_id = int(cursor.lastrowid)
            cursor.execute(
                "UPDATE cap_risk_incidents SET latest_progress=%s, incident_status='mitigating' WHERE risk_incident_id=%s",
                (payload.update_text, risk_incident_id),
            )
            audit_id = write_audit(
                cursor,
                x_user_id,
                "risk.update",
                "risk_incident",
                risk_incident_id,
                row["incident_title"],
                after=payload.model_dump(),
                risk_level="medium",
            )
        connection.commit()
    finally:
        connection.close()
    return {"ok": True, "update_id": update_id, "audit_id": audit_id}


@app.get("/api/workflow/tasks")
def workflow_tasks() -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT t.workflow_task_id AS id, t.task_name, t.task_status, t.due_at,
                       i.title AS instance_title, i.instance_status, u.display_name AS assignee
                FROM cap_workflow_tasks t
                JOIN cap_workflow_instances i ON i.workflow_instance_id=t.workflow_instance_id
                LEFT JOIN cap_users u ON u.user_id=t.assigned_user_id
                ORDER BY t.workflow_task_id DESC
                """
            )
            rows = cursor.fetchall()
    finally:
        connection.close()
    return {"count": len(rows), "items": rows}


@app.post("/api/workflow/instances")
def start_workflow(payload: StartWorkflowPayload, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            result = start_workflow_record(cursor, payload, x_user_id)
        connection.commit()
    finally:
        connection.close()
    return result


@app.post("/api/workflow/tasks/{task_id}/action")
def act_workflow_task(
    task_id: int,
    payload: WorkflowActionPayload,
    x_user_id: int | None = Header(default=1),
) -> dict[str, Any]:
    allowed = {"approve": "approved", "reject": "rejected", "transfer": "transferred", "archive": "archived"}
    if payload.action not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported workflow action")

    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT task_name, task_status FROM cap_workflow_tasks WHERE workflow_task_id=%s", (task_id,))
            row = cursor.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Workflow task not found")
            next_status = allowed[payload.action]
            cursor.execute(
                """
                UPDATE cap_workflow_tasks
                SET task_status=%s, acted_at=%s, action_comment=%s
                WHERE workflow_task_id=%s
                """,
                (next_status, datetime.now(), payload.comment, task_id),
            )
            audit_id = write_audit(
                cursor,
                x_user_id,
                f"workflow.{payload.action}",
                "workflow_task",
                task_id,
                row["task_name"],
                before={"status": row["task_status"]},
                after={"status": next_status, "comment": payload.comment},
                risk_level="medium" if payload.action == "reject" else "low",
            )
        connection.commit()
    finally:
        connection.close()
    return {"ok": True, "task_id": task_id, "status": next_status, "audit_id": audit_id}


@app.get("/api/documents")
def list_documents() -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT document_id AS id, title, document_kind, file_name, access_level,
                       watermark_policy, current_version_no, fulltext_status
                FROM cap_documents
                WHERE deleted_at IS NULL
                ORDER BY document_id DESC
                """
            )
            rows = cursor.fetchall()
    finally:
        connection.close()
    return {"count": len(rows), "items": rows}


@app.post("/api/documents")
def upload_document(payload: CreateDocumentPayload, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            result = create_document_record(cursor, payload, x_user_id)
        connection.commit()
    finally:
        connection.close()
    return result


@app.post("/api/documents/{document_id}/download")
def download_document(document_id: int, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT title, storage_uri FROM cap_documents WHERE document_id=%s", (document_id,))
            row = cursor.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Document not found")
            audit_id = write_audit(
                cursor,
                x_user_id,
                "document.download",
                "document",
                document_id,
                row["title"],
                after={"secondary_auth": True, "storage_uri": row["storage_uri"]},
                risk_level="high",
            )
        connection.commit()
    finally:
        connection.close()
    return {"ok": True, "document_id": document_id, "download_uri": row["storage_uri"], "audit_id": audit_id}


@app.post("/api/import-export/tasks")
def create_import_export_task(payload: ImportExportPayload, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO cap_import_export_tasks
                  (task_code, task_kind, entity_type, task_status, source_file_uri, result_file_uri,
                   total_rows, success_rows, failed_rows, error_summary, requested_by, requested_at)
                VALUES (%s, %s, %s, 'queued', %s, NULL, 0, 0, 0, NULL, %s, %s)
                """,
                (
                    f"IET-API-{uuid.uuid4().hex[:8].upper()}",
                    payload.task_kind,
                    payload.entity_type,
                    payload.source_file_uri,
                    x_user_id,
                    datetime.now(),
                ),
            )
            task_id = int(cursor.lastrowid)
            audit_id = write_audit(
                cursor,
                x_user_id,
                f"import_export.{payload.task_kind}",
                "import_export_task",
                task_id,
                payload.entity_type,
                after=payload.model_dump(),
            )
        connection.commit()
    finally:
        connection.close()
    return {"ok": True, "task_id": task_id, "audit_id": audit_id}


@app.post("/api/recycle/{recycle_item_id}/restore")
def restore_recycle_item(recycle_item_id: int, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT object_label, purge_status FROM cap_recycle_items WHERE recycle_item_id=%s", (recycle_item_id,))
            row = cursor.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Recycle item not found")
            cursor.execute(
                """
                UPDATE cap_recycle_items
                SET purge_status='restored', restored_by=%s, restored_at=%s
                WHERE recycle_item_id=%s
                """,
                (x_user_id, datetime.now(), recycle_item_id),
            )
            audit_id = write_audit(
                cursor,
                x_user_id,
                "recycle.restore",
                "recycle_item",
                recycle_item_id,
                row["object_label"],
                before={"status": row["purge_status"]},
                after={"status": "restored"},
                risk_level="medium",
            )
        connection.commit()
    finally:
        connection.close()
    return {"ok": True, "recycle_item_id": recycle_item_id, "audit_id": audit_id}


@app.post("/api/settings/preferences")
def save_preferences(payload: PreferencePayload, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO cap_user_preferences
                  (user_id, notification_json, favorite_nav_json, table_view_json)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                  notification_json=VALUES(notification_json),
                  favorite_nav_json=VALUES(favorite_nav_json),
                  table_view_json=VALUES(table_view_json)
                """,
                (
                    x_user_id,
                    dumps(payload.notification_json or {}, ensure_ascii=False),
                    dumps(payload.favorite_nav_json or [], ensure_ascii=False),
                    dumps(payload.table_view_json or {}, ensure_ascii=False),
                ),
            )
            audit_id = write_audit(
                cursor,
                x_user_id,
                "settings.preferences.save",
                "user",
                x_user_id,
                "preferences",
                after=payload.model_dump(),
            )
        connection.commit()
    finally:
        connection.close()
    return {"ok": True, "audit_id": audit_id}


@app.get("/api/ledger/{screen_id}")
def screen_ledger(screen_id: str) -> dict[str, Any]:
    query = LEDGER_QUERIES.get(screen_id)
    if query is None:
        raise HTTPException(status_code=404, detail=f"No ledger mapping for {screen_id}")

    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()
    finally:
        connection.close()
    return {"ok": True, "screen_id": screen_id, "source": "mysql", "count": len(rows), "items": rows}


@app.post("/api/screens/{screen_id}/primary-action")
def run_screen_primary_action(screen_id: str, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    action_code = f"screen.{screen_id}.primary_action"
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            entity_type = "screen"
            entity_id: int | None = None
            entity_label = screen_id
            result: dict[str, Any]

            if screen_id in {"project-list", "project-board"}:
                payload = CreateProjectPayload(
                    short_name=f"Frontend Project {uuid.uuid4().hex[:4].upper()}",
                    legal_name="Frontend Project Co",
                    industry_group="Enterprise Software",
                    city="Shanghai",
                    summary="Created by screen primary action.",
                )
                cursor.execute(
                    """
                    INSERT INTO cap_projects
                      (project_code, short_name, legal_name, opportunity_status, stage_label,
                       industry_group, city, registered_location, owner_user_id, source_channel,
                       summary, thesis, product_note, highlight_note, created_by)
                    VALUES (%s, %s, %s, 'sourced', 'Sourced', %s, %s, %s, %s,
                            'Screen Primary Action', %s, 'Pending thesis.', 'Pending product note.',
                            'Created from page header.', %s)
                    """,
                    (
                        f"PRJ-HDR-{uuid.uuid4().hex[:8].upper()}",
                        payload.short_name,
                        payload.legal_name,
                        payload.industry_group,
                        payload.city,
                        payload.city,
                        x_user_id,
                        payload.summary,
                        x_user_id,
                    ),
                )
                entity_id = int(cursor.lastrowid)
                entity_type = "project"
                entity_label = payload.short_name
                result = {"ok": True, "project_id": entity_id, "affected_table": "cap_projects"}

            elif screen_id in {"fund-list", "fund-add"}:
                payload = CreateFundPayload(fund_name=f"Frontend Fund {uuid.uuid4().hex[:4].upper()}", target_size=100000000)
                result = create_fund_record(cursor, payload, x_user_id)
                entity_type = "fund"
                entity_id = int(result["fund_id"])
                entity_label = payload.fund_name

            elif screen_id == "announcements":
                entity_label = f"Frontend Announcement {uuid.uuid4().hex[:4].upper()}"
                cursor.execute(
                    """
                    INSERT INTO cap_announcements
                      (announcement_code, title, body_text, audience_scope_json, publish_status, published_at, created_by)
                    VALUES (%s, %s, 'Created by screen primary action.', %s, 'published', %s, %s)
                    """,
                    (
                        f"ANN-HDR-{uuid.uuid4().hex[:8].upper()}",
                        entity_label,
                        dumps({"scope": "company"}, ensure_ascii=False),
                        datetime.now(),
                        x_user_id,
                    ),
                )
                entity_type = "announcement"
                entity_id = int(cursor.lastrowid)
                result = {"ok": True, "announcement_id": entity_id, "affected_table": "cap_announcements"}

            elif screen_id == "calendar":
                entity_label = f"Frontend Calendar {uuid.uuid4().hex[:4].upper()}"
                starts_at = datetime.now()
                cursor.execute(
                    """
                    INSERT INTO cap_calendar_events
                      (event_code, event_title, event_kind, linked_entity_type, starts_at, ends_at,
                       organizer_user_id, location_text, visibility)
                    VALUES (%s, %s, 'project', 'project', %s, %s, %s, 'Online', 'department')
                    """,
                    (
                        f"CAL-HDR-{uuid.uuid4().hex[:8].upper()}",
                        entity_label,
                        starts_at,
                        starts_at,
                        x_user_id,
                    ),
                )
                entity_type = "calendar_event"
                entity_id = int(cursor.lastrowid)
                result = {"ok": True, "calendar_event_id": entity_id, "affected_table": "cap_calendar_events"}

            elif screen_id == "message-center":
                cursor.execute(
                    """
                    UPDATE cap_messages
                    SET read_at=COALESCE(read_at, %s), message_box='all', action_status='dismissed'
                    WHERE recipient_user_id=%s AND read_at IS NULL
                    """,
                    (datetime.now(), x_user_id),
                )
                affected = int(cursor.rowcount)
                entity_type = "message"
                entity_label = "mark_all_read"
                result = {"ok": True, "affected_rows": affected, "affected_table": "cap_messages"}

            elif screen_id == "investor-list":
                entity_label = f"Frontend LP {uuid.uuid4().hex[:4].upper()}"
                cursor.execute(
                    """
                    INSERT INTO cap_investors
                      (investor_code, investor_name, investor_kind, qualification_status, risk_rating,
                       city, country_code, disclosure_status, owner_user_id, created_by)
                    VALUES (%s, %s, 'institution', 'pending', 'professional', 'Shanghai', 'CN', 'not_started', %s, %s)
                    """,
                    (f"INV-HDR-{uuid.uuid4().hex[:8].upper()}", entity_label, x_user_id, x_user_id),
                )
                entity_type = "investor"
                entity_id = int(cursor.lastrowid)
                result = {"ok": True, "investor_id": entity_id, "affected_table": "cap_investors"}

            elif screen_id in {"flow-center", "flow-project", "flow-fund", "flow-oa"}:
                family = "fund" if screen_id == "flow-fund" else "office" if screen_id == "flow-oa" else "project"
                payload = StartWorkflowPayload(title=f"Frontend Workflow {uuid.uuid4().hex[:4].upper()}", workflow_family=family)
                result = start_workflow_record(cursor, payload, x_user_id)
                entity_type = "workflow_instance"
                entity_id = int(result["workflow_instance_id"])
                entity_label = payload.title

            elif screen_id in {"document-center", "process-files"}:
                kind = "workflow" if screen_id == "process-files" else "shared"
                payload = CreateDocumentPayload(title=f"Frontend Document {uuid.uuid4().hex[:4].upper()}", document_kind=kind)
                result = create_document_record(cursor, payload, x_user_id)
                entity_type = "document"
                entity_id = int(result["document_id"])
                entity_label = payload.title

            elif screen_id in {"ai-workspace", "meeting-ai"}:
                parse_kind = "meeting_minutes" if screen_id == "meeting-ai" else "business_plan"
                entity_label = f"Frontend AI Job {uuid.uuid4().hex[:4].upper()}"
                cursor.execute(
                    """
                    INSERT INTO cap_ai_parse_jobs
                      (job_code, job_name, parse_kind, requested_by, job_status)
                    VALUES (%s, %s, %s, %s, 'queued')
                    """,
                    (f"AI-HDR-{uuid.uuid4().hex[:8].upper()}", entity_label, parse_kind, x_user_id),
                )
                entity_type = "ai_parse_job"
                entity_id = int(cursor.lastrowid)
                result = {"ok": True, "ai_parse_job_id": entity_id, "affected_table": "cap_ai_parse_jobs"}

            elif screen_id == "system-users":
                suffix = uuid.uuid4().hex[:6]
                entity_label = f"Frontend User {suffix}"
                cursor.execute(
                    """
                    INSERT INTO cap_users
                      (employee_no, login_name, display_name, email, account_status, timezone_name)
                    VALUES (%s, %s, %s, %s, 'active', 'Asia/Shanghai')
                    """,
                    (f"EMP-HDR-{suffix}", f"user_{suffix}", entity_label, f"user_{suffix}@example.local"),
                )
                entity_type = "user"
                entity_id = int(cursor.lastrowid)
                result = {"ok": True, "user_id": entity_id, "affected_table": "cap_users"}

            elif screen_id == "roles-permissions":
                suffix = uuid.uuid4().hex[:6]
                entity_label = f"Frontend Role {suffix}"
                cursor.execute(
                    """
                    INSERT INTO cap_roles (role_code, role_name, description, data_scope, is_system_role, is_active)
                    VALUES (%s, %s, 'Created by screen primary action.', 'owned', 0, 1)
                    """,
                    (f"ROLE_HDR_{suffix.upper()}", entity_label),
                )
                entity_type = "role"
                entity_id = int(cursor.lastrowid)
                result = {"ok": True, "role_id": entity_id, "affected_table": "cap_roles"}

            elif screen_id == "field-config":
                suffix = uuid.uuid4().hex[:6]
                entity_label = f"Frontend Field {suffix}"
                cursor.execute(
                    """
                    INSERT INTO cap_custom_field_definitions
                      (entity_type, field_key, field_label, data_type, is_required, is_searchable, display_order, created_by)
                    VALUES ('project', %s, %s, 'text', 0, 1, 100, %s)
                    """,
                    (f"frontend_field_{suffix}", entity_label, x_user_id),
                )
                entity_type = "custom_field"
                entity_id = int(cursor.lastrowid)
                result = {"ok": True, "custom_field_id": entity_id, "affected_table": "cap_custom_field_definitions"}

            elif screen_id == "import-export":
                cursor.execute(
                    """
                    INSERT INTO cap_import_export_tasks
                      (task_code, task_kind, entity_type, task_status, source_file_uri, total_rows,
                       success_rows, failed_rows, requested_by, requested_at)
                    VALUES (%s, 'template_download', 'screen_primary', 'queued', NULL, 0, 0, 0, %s, %s)
                    """,
                    (f"IET-HDR-{uuid.uuid4().hex[:8].upper()}", x_user_id, datetime.now()),
                )
                entity_type = "import_export_task"
                entity_id = int(cursor.lastrowid)
                entity_label = "screen_primary"
                result = {"ok": True, "task_id": entity_id, "affected_table": "cap_import_export_tasks"}

            else:
                result = {"ok": True, "affected_table": "cap_ui_action_events", "screen_id": screen_id}

            audit_id = write_audit(
                cursor,
                x_user_id,
                action_code,
                entity_type,
                entity_id,
                entity_label,
                after=result,
            )
            result["audit_id"] = audit_id
            event_payload = GenericActionPayload(
                action=action_code,
                entity_type=entity_type,
                entity_id=entity_id,
                entity_label=entity_label,
                after=result,
            )
            result["event_id"] = write_ui_action_event(cursor, x_user_id, audit_id, event_payload, result)
        connection.commit()
    finally:
        connection.close()
    return result


@app.post("/api/actions")
def record_action(payload: GenericActionPayload, x_user_id: int | None = Header(default=1)) -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            audit_id = write_audit(
                cursor,
                x_user_id,
                payload.action,
                payload.entity_type,
                payload.entity_id,
                payload.entity_label,
                before=payload.before,
                after=payload.after,
                risk_level=payload.risk_level,
            )
            result = {
                "ok": True,
                "audit_id": audit_id,
                "action": payload.action,
                "entity_type": payload.entity_type,
                "entity_id": payload.entity_id,
                "entity_label": payload.entity_label,
            }
            event_id = write_ui_action_event(cursor, x_user_id, audit_id, payload, result)
            result["event_id"] = event_id
        connection.commit()
    finally:
        connection.close()
    return result


@app.get("/api/ui-actions/recent")
def recent_ui_actions() -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            ensure_ui_action_table(cursor)
            cursor.execute(
                """
                SELECT e.ui_action_event_id AS id, e.audit_log_id AS audit_id, u.display_name AS actor,
                       e.action_code, e.entity_type, e.entity_label, e.event_status, e.occurred_at,
                       e.payload_json, e.result_json
                FROM cap_ui_action_events e
                LEFT JOIN cap_users u ON u.user_id=e.actor_user_id
                ORDER BY e.ui_action_event_id DESC
                LIMIT 20
                """
            )
            rows = cursor.fetchall()
        connection.commit()
    finally:
        connection.close()
    return {"count": len(rows), "items": rows}


@app.get("/api/audit/recent")
def recent_audit() -> dict[str, Any]:
    connection = connect_db()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT a.audit_log_id AS id, u.display_name AS actor, a.action_code,
                       a.entity_type, a.entity_label, a.risk_level, a.occurred_at
                FROM cap_audit_logs a
                LEFT JOIN cap_users u ON u.user_id=a.actor_user_id
                ORDER BY a.audit_log_id DESC
                LIMIT 20
                """
            )
            rows = cursor.fetchall()
    finally:
        connection.close()
    return {"count": len(rows), "items": rows}


@app.get("/api/db/ping")
def db_ping() -> dict[str, Any]:
    if pymysql is None:
        raise HTTPException(status_code=500, detail="pymysql is not installed")

    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    database = os.getenv("DB_NAME", "capitalos")
    port = int(os.getenv("DB_PORT", "3306"))

    if not host or not user or password is None:
        raise HTTPException(status_code=400, detail="DB_HOST, DB_USER and DB_PASSWORD are required")

    connection = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS screen_count FROM cap_navigation_items")
            screen_count = cursor.fetchone()["screen_count"]
            cursor.execute(
                "SELECT COUNT(*) AS table_count FROM information_schema.tables "
                "WHERE table_schema=%s AND table_name LIKE 'cap_%%'",
                (database,),
            )
            table_count = cursor.fetchone()["table_count"]
    finally:
        connection.close()

    return {"ok": True, "database": database, "tables": table_count, "screens": screen_count}
