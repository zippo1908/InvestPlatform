"""LLM 接入(真 AI 的唯一出口)。

设计目标:**一处配置、任意 OpenAI 兼容后端**,方便后续调试更换模型。
只依赖标准库 urllib —— 无需额外安装。

配置全部走 .env(见 .env.example 的 LLM_* 段):
  LLM_ENABLED   是否启用(false 时所有 AI 端点 fail-closed 返回可读提示)
  LLM_BASE_URL  OpenAI 兼容根地址,如:
                  OpenAI     https://api.openai.com/v1
                  DeepSeek   https://api.deepseek.com/v1
                  Moonshot   https://api.moonshot.cn/v1
                  Qwen       https://dashscope.aliyuncs.com/compatible-mode/v1
                  本地 vLLM/Ollama  http://127.0.0.1:11434/v1
  LLM_API_KEY   密钥(本地模型可留空)
  LLM_MODEL     模型名,如 gpt-4o-mini / deepseek-chat / moonshot-v1-8k / qwen-plus
  LLM_TIMEOUT   单次调用超时秒数(默认 30)

调试:GET /api/ai/status 可直接看当前是否配好、指向哪个 base_url/model(不回显 key)。
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


class LLMNotConfigured(Exception):
    """未启用/未配置 —— 端点应转 503 并回显如何配置。"""


class LLMError(Exception):
    """调用失败(网络/鉴权/响应异常)—— 端点应转 502。"""


def _cfg() -> dict[str, Any]:
    return {
        "enabled": os.getenv("LLM_ENABLED", "false").strip().lower() in {"1", "true", "yes"},
        "base_url": os.getenv("LLM_BASE_URL", "").strip().rstrip("/"),
        "api_key": os.getenv("LLM_API_KEY", "").strip(),
        "model": os.getenv("LLM_MODEL", "").strip(),
        "timeout": float(os.getenv("LLM_TIMEOUT", "30") or 30),
    }


def is_configured() -> bool:
    c = _cfg()
    return c["enabled"] and bool(c["base_url"]) and bool(c["model"])


def status() -> dict[str, Any]:
    """给 /api/ai/status 的调试视图 —— 绝不回显密钥。"""
    c = _cfg()
    return {
        "enabled": c["enabled"],
        "configured": is_configured(),
        "base_url": c["base_url"] or None,
        "model": c["model"] or None,
        "has_api_key": bool(c["api_key"]),
        "timeout": c["timeout"],
    }


def chat(messages: list[dict[str, str]], *, temperature: float = 0.2, max_tokens: int = 1200, json_mode: bool = False) -> str:
    """调用 OpenAI 兼容 /chat/completions,返回 assistant 文本。"""
    c = _cfg()
    if not is_configured():
        raise LLMNotConfigured(
            "LLM 未配置:请在 deploy/.env 设置 LLM_ENABLED=true 以及 LLM_BASE_URL / LLM_MODEL / LLM_API_KEY"
        )
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


def chat_stream(messages: list[dict[str, str]], *, temperature: float = 0.3, max_tokens: int = 1500):
    """流式调用:逐 token yield 文本增量(SSE 低延迟体验的后端来源)。"""
    c = _cfg()
    if not is_configured():
        raise LLMNotConfigured("LLM 未配置:请在 deploy/.env 配置 LLM_*")
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
    """要求模型返回 JSON,并做鲁棒解析(容忍 ```json 包裹或前后噪声)。"""
    raw = chat(messages, json_mode=True, **kwargs)
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1] if "```" in text[3:] else text.strip("`")
        if text.lstrip().startswith("json"):
            text = text.lstrip()[4:]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise LLMError(f"模型未返回可解析 JSON: {raw[:200]}")
