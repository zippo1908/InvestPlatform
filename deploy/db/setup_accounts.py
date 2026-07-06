#!/usr/bin/env python3
"""账户与演示数据一次性初始化(schema/seed/patch_tenancy/patch_auth 之后运行)。

做三件"需要逻辑"的事(纯 SQL 做不了 bcrypt):
  1. 给所有种子用户设 bcrypt 口令(默认 demo-login),便于按角色登录看 RBAC。
  2. 确保存在 demo.user(managing_partner),保留前端一键演示。
  3. 可选:种入第二租户 Meridian(独立公司树 + 用户 + 项目/基金),用于演示多租户隔离。

幂等:重复运行安全(口令覆盖、用户/租户用存在性判断)。

DB 连接:优先用环境变量 DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME(同后端 .env);
未设则回落到 127.0.0.1:3306 + 从 ~/.investplatform-mysql-root 读 root 口令。

用法:
    python setup_accounts.py                 # 口令 + demo.user
    python setup_accounts.py --with-tenant2   # 额外种入 Meridian 第二租户
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import bcrypt
import pymysql

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "demo-login")


def db_conn():
    pwd = os.getenv("DB_PASSWORD")
    if pwd is None:
        root_file = Path.home() / ".investplatform-mysql-root"
        pwd = root_file.read_text().strip() if root_file.exists() else ""
    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=pwd,
        database=os.getenv("DB_NAME", "capitalos"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def main() -> None:
    with_tenant2 = "--with-tenant2" in sys.argv
    conn = db_conn()
    try:
        with conn.cursor() as cur:
            demo_hash = hash_pw(DEMO_PASSWORD)

            # 1) 所有现有用户统一演示口令
            cur.execute("UPDATE cap_users SET password_hash=%s", (demo_hash,))

            # 2) demo.user(managing_partner)
            cur.execute("SELECT user_id FROM cap_users WHERE login_name='demo.user'")
            if cur.fetchone() is None:
                cur.execute("SELECT org_id FROM cap_users WHERE login_name='alex.gp' LIMIT 1")
                row = cur.fetchone()
                org_id = row["org_id"] if row else None
                cur.execute(
                    """INSERT INTO cap_users (org_id, employee_no, login_name, display_name, email, password_hash, account_status)
                       VALUES (%s,'DEMO-0001','demo.user','Demo User','demo.user@capitalos.local',%s,'active')""",
                    (org_id, demo_hash),
                )
                demo_uid = cur.lastrowid
                cur.execute(
                    """INSERT IGNORE INTO cap_user_roles (user_id, role_id)
                       SELECT %s, role_id FROM cap_roles WHERE role_code='managing_partner'""",
                    (demo_uid,),
                )

            # 2b) developer 账号:只授 developer 角色(仅 feedback.annotate),用于收集页面反馈。
            #     依赖 patch_developer_role.sql 已建 developer 角色;口令同 demo(默认 demo-login)。
            cur.execute("SELECT user_id FROM cap_users WHERE login_name='developer'")
            if cur.fetchone() is None:
                cur.execute("SELECT org_id FROM cap_users WHERE login_name='demo.user' LIMIT 1")
                row = cur.fetchone()
                dev_org = row["org_id"] if row else None
                cur.execute(
                    """INSERT INTO cap_users (org_id, employee_no, login_name, display_name, email, password_hash, account_status)
                       VALUES (%s,'DEV-0001','developer','Developer (Feedback)','developer@capitalos.local',%s,'active')""",
                    (dev_org, demo_hash),
                )
                dev_uid = cur.lastrowid
                cur.execute(
                    "INSERT IGNORE INTO cap_user_roles (user_id, role_id) SELECT %s, role_id FROM cap_roles WHERE role_code='developer'",
                    (dev_uid,),
                )

            # 3) 可选:第二租户 Meridian(演示多租户隔离)
            if with_tenant2:
                cur.execute("SELECT org_id FROM cap_organizations WHERE org_code='ORG-MER'")
                if cur.fetchone() is None:
                    cur.execute("INSERT INTO cap_organizations (org_code, parent_org_id, org_name, org_type) VALUES ('ORG-MER', NULL, 'Meridian Capital Group', 'company')")
                    t2 = cur.lastrowid
                    cur.execute("INSERT INTO cap_organizations (org_code, parent_org_id, org_name, org_type) VALUES ('ORG-MER-INV', %s, 'Meridian Investment', 'department')", (t2,))
                    dept = cur.lastrowid
                    cur.execute(
                        """INSERT INTO cap_users (org_id, employee_no, login_name, display_name, email, password_hash, account_status)
                           VALUES (%s,'MER-0001','mera.gp','Meridian Partner','mera.gp@meridian.local',%s,'active')""",
                        (dept, demo_hash),
                    )
                    meru = cur.lastrowid
                    cur.execute("INSERT IGNORE INTO cap_user_roles (user_id, role_id) SELECT %s, role_id FROM cap_roles WHERE role_code='managing_partner'", (meru,))
                    cur.execute(
                        """INSERT INTO cap_projects (project_code, short_name, legal_name, opportunity_status, stage_label, industry_group, city, owner_user_id, created_by, tenant_id)
                           VALUES ('PRJ-MER-1','Meridian Alpha','Meridian Alpha Co','sourced','Sourced','Fintech','Beijing',%s,%s,%s),
                                  ('PRJ-MER-2','Meridian Beta','Meridian Beta Co','screening','Screening','Biotech','Suzhou',%s,%s,%s)""",
                        (meru, meru, t2, meru, meru, t2),
                    )
                    cur.execute(
                        """INSERT INTO cap_funds (fund_code, fund_name, legal_name, fund_status, raise_method, base_currency, target_size, committed_size, paid_in_size, net_asset_value, created_by, tenant_id)
                           VALUES ('FUN-MER-1','Meridian Fund I','Meridian Fund I LP','investing','private','CNY',500000000,300000000,120000000,120000000,%s,%s)""",
                        (meru, t2),
                    )
        conn.commit()
        print(f"[ok] 口令已设(默认 {DEMO_PASSWORD});demo.user 就绪" + ("; Meridian 第二租户已种入" if with_tenant2 else ""))
        print("     生产部署请务必重置所有口令并更换 JWT_SECRET。")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
