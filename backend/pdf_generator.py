import os
import uuid
from datetime import datetime
from jinja2 import Template
from calculations import FinancialData, ComputedMetrics, compute, metrics_to_dict

PDF_DIR = os.getenv("PDF_DIR", "/app/pdfs")
os.makedirs(PDF_DIR, exist_ok=True)


def _fmt(v: float) -> str:
    return f"{round(v):,}".replace(",", "\u00a0")


def _pct(v: float) -> str:
    return f"{v:.1f}%"


def _badge(status: str) -> str:
    colors = {"good": "#1D9E75", "warn": "#BA7517", "bad": "#D85A30"}
    labels = {"good": "Норма", "warn": "Допустимо", "bad": "Риск"}
    c = colors.get(status, "#999")
    l = labels.get(status, "—")
    return f'<span style="background:{c}22;color:{c};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">{l}</span>'


def _assess(val, low, high=None) -> str:
    if high:
        return "good" if low <= val <= high else ("warn" if val >= low * 0.7 else "bad")
    return "good" if val >= low else ("warn" if val >= low * 0.7 else "bad")


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1a1a18; background: #fff; padding: 32px; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  h2 { font-size: 13px; font-weight: 600; margin-bottom: 12px; margin-top: 20px; padding-bottom: 6px; border-bottom: 1px solid #e0e0db; }
  h3 { font-size: 11px; font-weight: 600; color: #6b6b67; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1a1a18; }
  .company { font-size: 12px; color: #6b6b67; margin-top: 4px; }
  .period-badge { background: #3266ad; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .metric { background: #f7f7f5; border-radius: 8px; padding: 12px; }
  .metric-label { font-size: 10px; color: #6b6b67; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
  .metric-value { font-size: 18px; font-weight: 700; }
  .metric-sub { font-size: 10px; color: #9b9b97; margin-top: 3px; }
  .pos { color: #1D9E75; } .neg { color: #D85A30; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
  th { text-align: left; padding: 6px 8px; font-size: 10px; font-weight: 600; color: #6b6b67; text-transform: uppercase; border-bottom: 1px solid #e0e0db; }
  td { padding: 7px 8px; border-bottom: 1px solid #f0efeb; vertical-align: middle; }
  .rating-circle { display: inline-block; width: 48px; height: 48px; border-radius: 50%; border: 3px solid {{ rating_color }}; background: {{ rating_color }}18; text-align: center; line-height: 42px; font-size: 16px; font-weight: 700; color: {{ rating_color }}; }
  .rec-item { padding: 8px 12px; border-left: 3px solid #e0e0db; margin-bottom: 6px; border-radius: 0 4px 4px 0; background: #f7f7f5; }
  .rec-good { border-color: #1D9E75; }
  .rec-warn { border-color: #BA7517; }
  .rec-bad { border-color: #D85A30; }
  .waterfall-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f0efeb; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e0db; font-size: 10px; color: #9b9b97; display: flex; justify-content: space-between; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>Финансовый отчёт</h1>
    <div class="company">{{ company_name }} &nbsp;·&nbsp; {{ industry_label }}</div>
  </div>
  <div>
    <span class="period-badge">{{ period_name }}</span>
    <div style="font-size:10px;color:#9b9b97;margin-top:6px;text-align:right">Сформирован: {{ generated_at }}</div>
  </div>
</div>

<!-- SUMMARY -->
<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding:16px;background:#f7f7f5;border-radius:10px">
  <div class="rating-circle">{{ health_score }}/5</div>
  <div>
    <div style="font-size:16px;font-weight:700;color:{{ rating_color }}">{{ health_label }}</div>
    <div style="font-size:11px;color:#6b6b67;margin-top:2px">{{ health_score }} из 5 ключевых показателей соответствуют нормативам</div>
  </div>
</div>

<!-- KEY METRICS -->
<div class="grid4">
  <div class="metric"><div class="metric-label">Выручка</div><div class="metric-value">{{ revenue }}</div><div class="metric-sub">тыс. руб.</div></div>
  <div class="metric"><div class="metric-label">Чистая прибыль</div><div class="metric-value {{ 'pos' if np_pos else 'neg' }}">{{ net_profit }}</div><div class="metric-sub">тыс. руб.</div></div>
  <div class="metric"><div class="metric-label">ROE</div><div class="metric-value">{{ roe }}</div><div class="metric-sub">норма &gt;15%</div></div>
  <div class="metric"><div class="metric-label">Ликвидность</div><div class="metric-value">{{ cur_liq }}</div><div class="metric-sub">норма 1.5–2.5</div></div>
</div>

<!-- PNL -->
<h2>Отчёт о прибылях и убытках</h2>
<div class="grid2">
  <div>
    {% for row in waterfall %}
    <div class="waterfall-row">
      <span>{{ row.label }}</span>
      <span style="font-weight:600;color:{{ '#1D9E75' if row.pos else '#D85A30' if row.neg else '#1a1a18' }}">{{ row.value }}</span>
    </div>
    {% endfor %}
  </div>
  <div>
    <h3>Рентабельность</h3>
    <table>
      <tr><td>Валовая маржа</td><td style="text-align:right;font-weight:600">{{ gross_margin }}</td></tr>
      <tr><td>EBIT маржа</td><td style="text-align:right;font-weight:600">{{ ebit_margin }}</td></tr>
      <tr><td>Рентабельность продаж</td><td style="text-align:right;font-weight:600">{{ ros }}</td></tr>
      <tr><td>ROE (рент. капитала)</td><td style="text-align:right;font-weight:600">{{ roe }}</td></tr>
      <tr><td>ROA (рент. активов)</td><td style="text-align:right;font-weight:600">{{ roa }}</td></tr>
      <tr><td>ROIC</td><td style="text-align:right;font-weight:600">{{ roic }}</td></tr>
    </table>
  </div>
</div>

<!-- RATIOS -->
<div class="page-break"></div>
<h2>Финансовые коэффициенты</h2>
<div class="grid2">
  <div>
    <h3>Ликвидность</h3>
    <table>
      <thead><tr><th>Показатель</th><th>Значение</th><th>Норматив</th><th>Статус</th></tr></thead>
      <tbody>
        <tr><td>Текущая ликвидность</td><td><b>{{ cur_liq }}</b></td><td>1.5 – 2.5</td><td>{{ badge_cur_liq }}</td></tr>
        <tr><td>Быстрая ликвидность</td><td><b>{{ quick_liq }}</b></td><td>0.7 – 1.0</td><td>{{ badge_quick_liq }}</td></tr>
        <tr><td>Абсолютная ликвидность</td><td><b>{{ abs_liq }}</b></td><td>0.1 – 0.3</td><td>{{ badge_abs_liq }}</td></tr>
      </tbody>
    </table>
    <h3 style="margin-top:12px">Финансовая устойчивость</h3>
    <table>
      <thead><tr><th>Показатель</th><th>Значение</th><th>Норматив</th><th>Статус</th></tr></thead>
      <tbody>
        <tr><td>Коэффициент автономии</td><td><b>{{ autonomy }}</b></td><td>≥ 0.5</td><td>{{ badge_autonomy }}</td></tr>
        <tr><td>Долг / Капитал</td><td><b>{{ debt2eq }}</b></td><td>≤ 1.0</td><td>{{ badge_d2e }}</td></tr>
        <tr><td>Покрытие ВА</td><td><b>{{ cov }}</b></td><td>≥ 1.0</td><td>{{ badge_cov }}</td></tr>
      </tbody>
    </table>
  </div>
  <div>
    <h3>Деловая активность</h3>
    <table>
      <thead><tr><th>Показатель</th><th>Значение</th><th>Норматив</th></tr></thead>
      <tbody>
        <tr><td>Оборачиваемость активов</td><td><b>{{ asset_turn }}x</b></td><td>&gt; 1.0</td></tr>
        <tr><td>Дни ДЗ</td><td><b>{{ rec_days }} дн.</b></td><td>&lt; 60 дн.</td></tr>
        <tr><td>Дни запасов</td><td><b>{{ inv_days }} дн.</b></td><td>&lt; 60 дн.</td></tr>
        <tr><td>Дни кредиторки</td><td><b>{{ pay_days }} дн.</b></td><td>30–90 дн.</td></tr>
      </tbody>
    </table>
    <h3 style="margin-top:12px">Дюпон — разложение ROE</h3>
    <div style="background:#f7f7f5;padding:10px;border-radius:6px;font-size:11px;line-height:2">
      ROE = <b style="color:#3266ad">{{ ros }}</b> (рент. продаж)
          × <b style="color:#1D9E75">{{ asset_turn }}x</b> (оборач.)
          × <b style="color:#BA7517">{{ leverage }}</b> (леверидж)
          = <b>{{ roe }}</b>
    </div>
  </div>
</div>

<!-- CASH FLOW -->
<h2>Кэш-флоу</h2>
<div class="grid4" style="grid-template-columns:repeat(3,1fr)">
  <div class="metric"><div class="metric-label">Операционный CF</div><div class="metric-value {{ 'pos' if cf_op_pos else 'neg' }}">{{ cf_op }}</div></div>
  <div class="metric"><div class="metric-label">Инвестиционный CF</div><div class="metric-value">{{ cf_inv }}</div></div>
  <div class="metric"><div class="metric-label">Свободный CF (FCF)</div><div class="metric-value {{ 'pos' if fcf_pos else 'neg' }}">{{ fcf }}</div></div>
</div>

<!-- RECOMMENDATIONS -->
<h2>Рекомендации</h2>
{% for rec in recommendations %}
<div class="rec-item rec-{{ rec.cls }}"><strong>{{ rec.title }}</strong><br><span style="color:#6b6b67">{{ rec.body }}</span></div>
{% endfor %}

<div class="footer">
  <span>FinScope — финансовый анализ для учредителей</span>
  <span>{{ generated_at }}</span>
</div>
</body>
</html>"""


async def generate_pdf(period, company, fd: FinancialData, m: ComputedMetrics, all_periods) -> str:
    try:
        from weasyprint import HTML
    except ImportError:
        # fallback: return simple HTML as PDF placeholder
        pass

    rating_color = "#1D9E75" if m.health_score >= 4 else "#BA7517" if m.health_score >= 3 else "#D85A30"
    industry_labels = {"general":"Общий","trade":"Торговля","manufacturing":"Производство","service":"Услуги","construction":"Строительство"}
    industry_label = industry_labels.get(company.industry if company else "general", "Общий")

    waterfall = [
        {"label": "Выручка", "value": _fmt(fd.revenue), "pos": True, "neg": False},
        {"label": "− Себестоимость", "value": _fmt(fd.cogs), "pos": False, "neg": True},
        {"label": "= Валовая прибыль", "value": _fmt(m.gross_profit), "pos": m.gross_profit >= 0, "neg": m.gross_profit < 0},
        {"label": "− Коммерч. расходы", "value": _fmt(fd.selling_exp), "pos": False, "neg": True},
        {"label": "− Управл. расходы", "value": _fmt(fd.admin_exp), "pos": False, "neg": True},
        {"label": "= EBIT", "value": _fmt(m.ebit), "pos": m.ebit >= 0, "neg": m.ebit < 0},
        {"label": "− Проценты", "value": _fmt(fd.interest_exp), "pos": False, "neg": True},
        {"label": "− Налог", "value": _fmt(fd.tax), "pos": False, "neg": True},
        {"label": "= Чистая прибыль", "value": _fmt(m.net_profit), "pos": m.net_profit >= 0, "neg": m.net_profit < 0},
    ]

    recommendations = []
    if m.current_ratio < 1.5:
        recommendations.append({"title": "⚡ СРОЧНО: Управление ликвидностью", "body": f"Текущая ликвидность {m.current_ratio:.2f} ниже норматива 1.5. Рекомендуется реструктуризация краткосрочного долга и ускорение инкассации дебиторской задолженности.", "cls": "bad"})
    if m.autonomy < 0.5:
        recommendations.append({"title": "⚠ ВАЖНО: Снижение долговой нагрузки", "body": f"Автономия {_pct(m.autonomy*100)} — высокая зависимость от кредиторов. Реинвестирование прибыли повысит устойчивость.", "cls": "warn"})
    if m.receivables_days > 60:
        recommendations.append({"title": "⚠ ВАЖНО: Дебиторская задолженность", "body": f"ДЗ оборачивается за {round(m.receivables_days)} дней. Ужесточение кредитной политики и контроль просроченной ДЗ.", "cls": "warn"})
    if m.roe < 15:
        recommendations.append({"title": "📈 Повышение рентабельности капитала", "body": f"ROE {_pct(m.roe)} ниже порогового значения 15%. Рекомендуется анализ структуры затрат и развитие высокомаржинальных направлений.", "cls": "warn"})
    if m.fcf < 0:
        recommendations.append({"title": "📊 Контроль свободного денежного потока", "body": f"FCF отрицательный ({_fmt(m.fcf)} тыс. руб.). Пересмотр инвестиционной программы или привлечение дополнительного финансирования.", "cls": "bad"})
    if not recommendations:
        recommendations.append({"title": "✓ Финансовое состояние удовлетворительное", "body": "Все ключевые показатели в норме. Рекомендуется сохранять текущую финансовую дисциплину и мониторить динамику ежеквартально.", "cls": "good"})

    context = {
        "company_name": company.name if company else "Компания",
        "industry_label": industry_label,
        "period_name": period.name,
        "generated_at": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "health_score": m.health_score,
        "health_label": m.health_label,
        "rating_color": rating_color,
        "revenue": _fmt(fd.revenue),
        "net_profit": _fmt(m.net_profit),
        "np_pos": m.net_profit >= 0,
        "roe": _pct(m.roe),
        "roa": _pct(m.roa),
        "ros": _pct(m.net_margin),
        "roic": _pct(m.roic),
        "gross_margin": _pct(m.gross_margin),
        "ebit_margin": _pct(m.ebit_margin),
        "cur_liq": f"{m.current_ratio:.2f}",
        "quick_liq": f"{m.quick_ratio:.2f}",
        "abs_liq": f"{m.absolute_ratio:.2f}",
        "autonomy": f"{m.autonomy:.2f}",
        "debt2eq": f"{m.debt_to_equity:.2f}",
        "cov": f"{m.fixed_assets_coverage:.2f}",
        "asset_turn": f"{m.asset_turnover:.2f}",
        "rec_days": round(m.receivables_days),
        "inv_days": round(m.inventory_days),
        "pay_days": round(m.payables_days),
        "leverage": f"{m.financial_leverage:.2f}",
        "cf_op": _fmt(m.cf_operating),
        "cf_op_pos": m.cf_operating >= 0,
        "cf_inv": _fmt(m.cf_investing),
        "fcf": _fmt(m.fcf),
        "fcf_pos": m.fcf >= 0,
        "badge_cur_liq": _badge(_assess(m.current_ratio, 1.5, 2.5)),
        "badge_quick_liq": _badge(_assess(m.quick_ratio, 0.7, 1.5)),
        "badge_abs_liq": _badge(_assess(m.absolute_ratio, 0.1, 0.5)),
        "badge_autonomy": _badge(_assess(m.autonomy, 0.5)),
        "badge_d2e": _badge("good" if m.debt_to_equity <= 1 else "warn" if m.debt_to_equity <= 1.5 else "bad"),
        "badge_cov": _badge(_assess(m.fixed_assets_coverage, 1.0)),
        "waterfall": waterfall,
        "recommendations": recommendations,
    }

    html_content = Template(HTML_TEMPLATE).render(**context)
    pdf_path = os.path.join(PDF_DIR, f"report_{uuid.uuid4().hex[:8]}.pdf")

    try:
        from weasyprint import HTML as WP
        WP(string=html_content).write_pdf(pdf_path)
    except Exception:
        # Save as HTML if weasyprint fails
        pdf_path = pdf_path.replace(".pdf", ".html")
        with open(pdf_path, "w", encoding="utf-8") as f:
            f.write(html_content)

    return pdf_path
