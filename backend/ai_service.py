import os
import httpx
from calculations import FinancialData, ComputedMetrics


ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-20250514"

HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
}


def _fmt(v: float) -> str:
    return f"{round(v):,}".replace(",", " ")


def _pct(v: float) -> str:
    return f"{v:.1f}%"


def _build_context(period, fd: FinancialData, m: ComputedMetrics, company=None) -> str:
    company_name = company.name if company else "предприятие"
    industry = company.industry if company else "general"
    return f"""Компания: {company_name} | Период: {period.name} | Отрасль: {industry}
{f"Комментарий бухгалтера: {period.comment}" if period.comment else ""}

ФИНАНСОВЫЕ ДАННЫЕ (тыс. руб.):
Выручка: {_fmt(fd.revenue)} | Себест.: {_fmt(fd.cogs)} | Вал. прибыль: {_fmt(m.gross_profit)}
EBIT: {_fmt(m.ebit)} | Чистая прибыль: {_fmt(m.net_profit)}
Активы: {_fmt(m.total_assets)} | Внеоборотные: {_fmt(m.non_current_assets)} | Оборотные: {_fmt(m.current_assets)}
Деньги: {_fmt(fd.cash)} | ДЗ: {_fmt(fd.receivables)} | Запасы: {_fmt(fd.inventory)}
Собств. капитал: {_fmt(m.equity)} | Долгоср. долг: {_fmt(m.lt_debt)} | Краткоср. долг: {_fmt(m.st_debt)}
CF операц.: {_fmt(m.cf_operating)} | CF инвест.: {_fmt(m.cf_investing)} | FCF: {_fmt(m.fcf)}

КОЭФФИЦИЕНТЫ:
Ликвидность: текущая {m.current_ratio:.2f} (норма 1.5-2.5), быстрая {m.quick_ratio:.2f}, абсолютная {m.absolute_ratio:.2f}
Устойчивость: автономия {_pct(m.autonomy*100)} (норма >50%), долг/капитал {m.debt_to_equity:.2f}
Рентабельность: ROS {_pct(m.net_margin)}, ROE {_pct(m.roe)}, ROA {_pct(m.roa)}, ROIC {_pct(m.roic)}
Маржа: валовая {_pct(m.gross_margin)}, операционная {_pct(m.ebit_margin)}
Активность: оборачиваемость активов {m.asset_turnover:.2f}x, дни ДЗ {round(m.receivables_days)}, дни запасов {round(m.inventory_days)}
Рейтинг: {m.health_score}/5 — {m.health_label}"""


async def get_ai_analysis(period, fd: FinancialData, m: ComputedMetrics, company=None) -> str:
    if not ANTHROPIC_API_KEY:
        return "API ключ Anthropic не настроен. Добавьте ANTHROPIC_API_KEY в .env файл."

    context = _build_context(period, fd, m, company)
    prompt = f"""{context}

Подготовь структурированный финансовый отчёт для учредителей на русском языке.

Структура (используй эти заголовки):
## Общая оценка
(2-3 предложения простым языком — что происходит с компанией)

## Сильные стороны
(конкретные факты с цифрами, 3-4 пункта)

## Зоны риска
(честный анализ проблем с объяснением последствий, 3-4 пункта)

## Рекомендации учредителю
(3-5 конкретных действий с приоритетом: СРОЧНО / ВАЖНО / РЕКОМЕНДУЕТСЯ)

## Прогноз
(что произойдёт при текущей динамике через 6-12 месяцев, 2-3 предложения)

Пиши чётко, без лишнего жаргона. Каждый пункт — конкретно, с числами из данных."""

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(API_URL, headers=HEADERS, json={
            "model": MODEL,
            "max_tokens": 1500,
            "messages": [{"role": "user", "content": prompt}]
        })
        data = resp.json()
        return data["content"][0]["text"]


async def get_ai_chat(message: str, history: list, period, fd: FinancialData, m: ComputedMetrics) -> str:
    if not ANTHROPIC_API_KEY:
        return "API ключ не настроен."

    context = _build_context(period, fd, m)
    system = f"Ты финансовый советник. Отвечай кратко и по существу на русском языке. Данные компании:\n{context}"

    messages = []
    for h in history[-8:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(API_URL, headers=HEADERS, json={
            "model": MODEL,
            "max_tokens": 600,
            "system": system,
            "messages": messages
        })
        data = resp.json()
        return data["content"][0]["text"]
