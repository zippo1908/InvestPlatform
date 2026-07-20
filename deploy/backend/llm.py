"""LLM 接入(真 AI 的唯一出口)。

设计目标:**一处配置、多 provider 可切换**,方便后续调试更换模型。
只依赖标准库 urllib —— 无需额外安装。

配置全部走 .env(见 .env.example 的 LLM_* 段):
  LLM_PROVIDER  服务方式,三选一(默认 openai,行为与历史版本完全一致):
                  openai       OpenAI 兼容 HTTP(下方 LLM_BASE_URL/LLM_MODEL/LLM_API_KEY)
                  claude-cli   本机 claude CLI 纯推理(`claude -p`,禁工具、限并发;
                               服务器已安装且已登录时零配置可用)
                  tinci-agent  公司 AI 网关(ai.tinci.com 自研 agent SSE 接口,见 TINCI_AI_* 段)
  LLM_ENABLED   是否启用 openai provider(false 时 openai 端 fail-closed 返回可读提示;
                claude-cli / tinci-agent 由「显式选择 provider」本身作为开关,不看此项)
  LLM_BASE_URL  OpenAI 兼容根地址,如:
                  OpenAI     https://api.openai.com/v1
                  DeepSeek   https://api.deepseek.com/v1
                  Moonshot   https://api.moonshot.cn/v1
                  Qwen       https://dashscope.aliyuncs.com/compatible-mode/v1
                  本地 vLLM/Ollama  http://127.0.0.1:11434/v1
  LLM_API_KEY   密钥(本地模型可留空)
  LLM_MODEL     模型名,如 gpt-4o-mini / deepseek-chat / moonshot-v1-8k / qwen-plus
  LLM_TIMEOUT   单次调用超时秒数(默认 120,对三种 provider 均生效)

tinci-agent 专属(未配全时该 provider 视为未配置):
  TINCI_AI_BASE_URL / TINCI_AI_TOKEN / TINCI_AI_WORKSPACE_ID / TINCI_AI_AGENT_ID
  TINCI_AI_MODEL(默认 deepseek-chat)/ TINCI_AI_MODEL_PROVIDER(默认 deepseek)

降级链:选定 provider 调用失败(LLMError)时,若本机 claude CLI 可用则自动兜底
claude-cli 再试一次(打日志),仍失败才抛 LLMError。fail-closed 语义不变:
未配置仍抛 LLMNotConfigured(端点转 503)。

调试:GET /api/ai/status 可直接看当前 provider / base_url / model(不回显 key)。
"""
from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import threading
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger("llm")


class LLMNotConfigured(Exception):
    """未启用/未配置 —— 端点应转 503 并回显如何配置。"""


class LLMError(Exception):
    """调用失败(网络/鉴权/响应异常)—— 端点应转 502。"""


# claude -p 并发闸:纯推理也要避免同时起太多进程(移植自采购台 core/llm.py)。
_claude_gate = threading.Semaphore(3)

# claude -p 禁用的全部工具:确保纯推理,不读写文件、不联网、不起子任务。
_NO_TOOLS = (
    "Bash,Edit,Write,NotebookEdit,Read,Glob,Grep,Task,Workflow,WebFetch,WebSearch,"
    "TaskCreate,TaskUpdate,ToolSearch,Skill"
)


def _cfg() -> dict[str, Any]:
    return {
        "provider": (os.getenv("LLM_PROVIDER", "openai").strip().lower() or "openai"),
        "enabled": os.getenv("LLM_ENABLED", "false").strip().lower() in {"1", "true", "yes"},
        "base_url": os.getenv("LLM_BASE_URL", "").strip().rstrip("/"),
        "api_key": os.getenv("LLM_API_KEY", "").strip(),
        "model": os.getenv("LLM_MODEL", "").strip(),
        "timeout": float(os.getenv("LLM_TIMEOUT", "120") or 120),
        # tinci-agent 专属配置(公司 AI 网关,非 OpenAI 协议)
        "tinci_base_url": os.getenv("TINCI_AI_BASE_URL", "").strip().rstrip("/"),
        "tinci_token": os.getenv("TINCI_AI_TOKEN", "").strip(),
        "tinci_workspace_id": os.getenv("TINCI_AI_WORKSPACE_ID", "").strip(),
        "tinci_agent_id": os.getenv("TINCI_AI_AGENT_ID", "").strip(),
        "tinci_model": os.getenv("TINCI_AI_MODEL", "deepseek-chat").strip(),
        "tinci_model_provider": os.getenv("TINCI_AI_MODEL_PROVIDER", "deepseek").strip(),
    }


def _claude_available() -> bool:
    return shutil.which("claude") is not None


def _tinci_ready(c: dict[str, Any]) -> bool:
    return bool(c["tinci_base_url"] and c["tinci_token"] and c["tinci_workspace_id"] and c["tinci_agent_id"])


def is_configured() -> bool:
    c = _cfg()
    if c["provider"] == "claude-cli":
        return _claude_available()
    if c["provider"] == "tinci-agent":
        return _tinci_ready(c)
    return c["enabled"] and bool(c["base_url"]) and bool(c["model"])


def status() -> dict[str, Any]:
    """给 /api/ai/status 的调试视图 —— 绝不回显密钥。"""
    c = _cfg()
    if c["provider"] == "claude-cli":
        model: str | None = "claude-cli(本机)"
    elif c["provider"] == "tinci-agent":
        model = f"Tinci AI · {c['tinci_model']}"
    else:
        model = c["model"] or None
    return {
        "provider": c["provider"],
        "enabled": c["enabled"],
        "configured": is_configured(),
        "base_url": c["base_url"] or None,
        "model": model,
        "has_api_key": bool(c["api_key"]),
        "timeout": c["timeout"],
    }


# ── JSON 修复(移植自采购台 core/llm.py:救回「AI 分析很好但 JSON 非法」)────────
def _repair_stray_quotes(s: str) -> str:
    """修复模型在 JSON 字符串值里写的未转义 ASCII 双引号(如 标注"无内衬")。
    启发式:字符串内遇到 " 时前看,只有其后首个非空字符是 ,:}] 或到结尾才当作真正的收尾引号,
    否则视为内容并转义成 \\"。能救回绝大多数"AI分析很好但JSON非法"的场景。"""
    out: list[str] = []
    in_str = False
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if not in_str:
            out.append(c)
            if c == '"':
                in_str = True
        else:
            if c == "\\" and i + 1 < n:
                out.append(c)
                out.append(s[i + 1])
                i += 2
                continue
            if c == '"':
                j = i + 1
                while j < n and s[j] in " \t\r\n":
                    j += 1
                if j >= n or s[j] in ",:}]":
                    out.append(c)
                    in_str = False
                else:
                    out.append('\\"')  # 串内游离引号 → 转义
            else:
                out.append(c)
        i += 1
    return "".join(out)


def extract_json(reply: str | None) -> dict | None:
    """从大模型回复里稳健地抠出 JSON 对象:剥 ```代码围栏```、取最外层 {},
    直连失败再走游离引号修复。全失败返回 None(调用方决定降级或报错)。"""
    if not reply:
        return None
    s = reply.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z]*\n?", "", s)
        s = re.sub(r"\n?```\s*$", "", s).strip()
    try:
        s = s[s.index("{") : s.rindex("}") + 1]
    except ValueError:
        return None
    for candidate in (s, _repair_stray_quotes(s)):
        try:
            v = json.loads(candidate)
            if isinstance(v, dict):
                return v
        except (ValueError, TypeError):
            continue
    logger.warning("大模型回复非法 JSON,已尝试修复仍失败: %s", s[:200])
    return None


# ── 三种 provider 的单轮补全实现 ─────────────────────────────────────────────
def _openai_chat(c: dict[str, Any], messages: list[dict[str, str]], *, temperature: float, max_tokens: int, json_mode: bool) -> str:
    """OpenAI 兼容 /chat/completions(历史行为,原样保留)。"""
    body: dict[str, Any] = {"model": c["model"], "messages": messages, "temperature": temperature, "max_tokens": max_tokens}
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    req = urllib.request.Request(
        f"{c['base_url']}/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    if c["api_key"]:
        req.add_header("Authorization", f"Bearer {c['api_key']}")
    try:
        with urllib.request.urlopen(req, timeout=c["timeout"]) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")[:400]
        raise LLMError(f"LLM HTTP {exc.code}: {detail}")
    except Exception as exc:  # noqa: BLE001 —— 网络/超时/解析统一归一
        raise LLMError(f"LLM 调用失败: {exc}")
    try:
        return payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise LLMError(f"LLM 响应结构异常: {json.dumps(payload)[:300]}")


def _claude_chat(messages: list[dict[str, str]], timeout: float | None = None) -> str:
    """claude -p 单轮补全:system 走 --append-system-prompt,禁全部工具,直接产出文本。
    (移植自采购台 core/llm.py;失败抛 LLMError 以对齐本项目异常语义。)"""
    system = "\n\n".join(m["content"] for m in messages if m.get("role") == "system")
    prompt = "\n\n".join(m["content"] for m in messages if m.get("role") != "system")
    if not prompt.strip():
        raise LLMError("claude-cli:没有可发送的用户内容")
    cmd = [
        "claude", "-p", prompt,
        "--output-format", "text",
        "--max-turns", "3",
        "--disallowedTools", _NO_TOOLS,
        "--append-system-prompt",
        (system + "\n\n" if system else "") + "直接输出最终回答,不要调用任何工具,不要解释你的过程。",
    ]
    try:
        with _claude_gate:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout or _cfg()["timeout"])
    except subprocess.TimeoutExpired:
        raise LLMError("claude-cli 调用超时")
    except Exception as exc:  # noqa: BLE001
        raise LLMError(f"claude-cli 调用失败: {exc}")
    text = (out.stdout or "").strip()
    if not text:
        raise LLMError(f"claude-cli 返回空内容(exit={out.returncode}): {(out.stderr or '')[:200]}")
    return text


def _tinci_agent_chat(c: dict[str, Any], messages: list[dict[str, str]]) -> str:
    """公司 AI 网关(ai.tinci.com,自研 agent SSE 接口)单轮补全适配。

    非 OpenAI 协议:POST /api/v1/chat/stream(SSE),body 带 agentId/message/conversationId/
    modelName/modelProvider,鉴权 Bearer + x-workspace-id。把 system+user 拼成单条 message,
    消费流:优先取 done 事件 segments 里 type=content 的完整文本,兜底累积 content_delta。
    (移植自采购台 core/llm.py,httpx 改标准库 urllib。)"""
    import uuid

    system = "\n\n".join(m["content"] for m in messages if m.get("role") == "system")
    user = "\n\n".join(m["content"] for m in messages if m.get("role") != "system")
    if not user.strip() and not system.strip():
        raise LLMError("tinci-agent:没有可发送的内容")
    message = (system + "\n\n---\n\n" if system else "") + user
    body = {
        "agentId": int(c["tinci_agent_id"]),  # 大整数(超2^53):env 存字符串,发请求转 int 无损
        "message": message,
        "conversationId": "conv_" + uuid.uuid4().hex[:16],
        "modelName": c["tinci_model"],
        "modelProvider": c["tinci_model_provider"],
    }
    req = urllib.request.Request(
        f"{c['tinci_base_url']}/api/v1/chat/stream",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "text/event-stream")
    req.add_header("authorization", f"Bearer {c['tinci_token']}")
    req.add_header("x-workspace-id", str(c["tinci_workspace_id"]))
    text = ""
    try:
        with urllib.request.urlopen(req, timeout=c["timeout"]) as resp:
            cur = None
            for raw in resp:
                line = raw.decode("utf-8", "ignore").rstrip("\r\n")
                if line.startswith("event:"):
                    cur = line[6:].strip()
                elif line.startswith("data:"):
                    try:
                        d = json.loads(line[5:])
                    except ValueError:
                        continue
                    if cur == "content_delta" and "delta" in d:
                        text += d["delta"]
                    elif cur == "done" and "segments" in d:
                        seg = "".join(s.get("text", "") for s in d["segments"] if s.get("type") == "content")
                        if seg:
                            text = seg
                    elif cur == "error":
                        # 网关用 HTTP 200 + SSE error 帧报错(如 token 过期"未登录,请先登录"),
                        # HTTP 层抓不到——显式抛错,否则失败被静默吞、无从排查。
                        raise LLMError(f"Tinci AI 网关返回错误帧: {d.get('message') or d}")
    except LLMError:
        raise
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")[:400]
        raise LLMError(f"Tinci AI HTTP {exc.code}: {detail}")
    except Exception as exc:  # noqa: BLE001
        raise LLMError(f"Tinci AI 调用失败: {type(exc).__name__}: {exc}")
    if not text:
        raise LLMError("Tinci AI 返回空内容(无 content/done 段)")
    return text


def _not_configured_msg(provider: str) -> str:
    if provider == "claude-cli":
        return "LLM 未配置:LLM_PROVIDER=claude-cli 但本机找不到 claude CLI(需安装并登录)"
    if provider == "tinci-agent":
        return "LLM 未配置:LLM_PROVIDER=tinci-agent 需在 deploy/.env 配全 TINCI_AI_BASE_URL / TINCI_AI_TOKEN / TINCI_AI_WORKSPACE_ID / TINCI_AI_AGENT_ID"
    return "LLM 未配置:请在 deploy/.env 设置 LLM_ENABLED=true 以及 LLM_BASE_URL / LLM_MODEL / LLM_API_KEY"


def chat(messages: list[dict[str, str]], *, temperature: float = 0.2, max_tokens: int = 1200, json_mode: bool = False) -> str:
    """同步单轮补全,按 LLM_PROVIDER 分发,返回 assistant 文本。

    降级链:选定 provider 抛 LLMError 时,若本机 claude 可用则兜底 claude-cli 再试一次
    (打 warning 日志),仍失败抛出原始 LLMError。"""
    c = _cfg()
    if not is_configured():
        raise LLMNotConfigured(_not_configured_msg(c["provider"]))
    # claude-cli / tinci-agent 不支持 response_format,改用 system 指令约束 JSON 输出,
    # 剩余噪声由 chat_json/extract_json 兜住。
    if json_mode and c["provider"] != "openai":
        messages = [{"role": "system", "content": "只输出一个 JSON 对象,不要输出任何其它文字、解释或代码围栏。"}] + list(messages)
    try:
        if c["provider"] == "claude-cli":
            return _claude_chat(messages)
        if c["provider"] == "tinci-agent":
            return _tinci_agent_chat(c, messages)
        return _openai_chat(c, messages, temperature=temperature, max_tokens=max_tokens, json_mode=json_mode)
    except LLMError as exc:
        if c["provider"] != "claude-cli" and _claude_available():
            logger.warning("LLM provider=%s 调用失败,兜底本机 claude-cli: %s", c["provider"], exc)
            try:
                return _claude_chat(messages)
            except LLMError as exc2:
                raise LLMError(f"{exc};claude-cli 兜底亦失败: {exc2}")
        raise


def chat_stream(messages: list[dict[str, str]], *, temperature: float = 0.3, max_tokens: int = 1500):
    """流式调用:逐 token yield 文本增量(SSE 低延迟体验的后端来源)。
    claude-cli / tinci-agent 不支持逐 token 流,降级为一次性 yield 完整回答(前端仍可用)。"""
    c = _cfg()
    if not is_configured():
        raise LLMNotConfigured(_not_configured_msg(c["provider"]))
    if c["provider"] != "openai":
        yield chat(messages, temperature=temperature, max_tokens=max_tokens)
        return
    body = {
        "model": c["model"],
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }
    req = urllib.request.Request(
        f"{c['base_url']}/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    if c["api_key"]:
        req.add_header("Authorization", f"Bearer {c['api_key']}")
    try:
        resp = urllib.request.urlopen(req, timeout=c["timeout"])
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")[:400]
        raise LLMError(f"LLM HTTP {exc.code}: {detail}")
    except Exception as exc:  # noqa: BLE001
        raise LLMError(f"LLM 流式连接失败: {exc}")
    # 上游按 SSE 行返回:`data: {...}` / `data: [DONE]`。逐行解析增量。
    for raw in resp:
        line = raw.decode("utf-8", "ignore").strip()
        if not line or not line.startswith("data:"):
            continue
        data = line[5:].strip()
        if data == "[DONE]":
            break
        try:
            chunk = json.loads(data)
            delta = chunk["choices"][0]["delta"].get("content")
        except (KeyError, IndexError, ValueError, TypeError):
            continue
        if delta:
            yield delta


def chat_json(messages: list[dict[str, str]], **kwargs: Any) -> Any:
    """要求模型返回 JSON,并做鲁棒解析(容忍 ```json 包裹、前后噪声、串内游离引号)。"""
    raw = chat(messages, json_mode=True, **kwargs)
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1] if "```" in text[3:] else text.strip("`")
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]
    try:
        return json.loads(text)  # 直连解析(兼容顶层数组等历史行为)
    except json.JSONDecodeError:
        pass
    parsed = extract_json(raw)  # 抠最外层 {} + 游离引号修复
    if parsed is not None:
        return parsed
    raise LLMError(f"模型未返回可解析 JSON: {raw[:200]}")
