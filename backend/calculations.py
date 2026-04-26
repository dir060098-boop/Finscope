from dataclasses import dataclass
from typing import Optional


@dataclass
class FinancialData:
    fixed_assets: float = 0
    intangibles: float = 0
    inventory: float = 0
    receivables: float = 0
    cash: float = 0
    other_current: float = 0
    equity_share: float = 0
    retained_earnings: float = 0
    lt_loans: float = 0
    lt_other: float = 0
    st_loans: float = 0
    payables: float = 0
    st_other: float = 0
    revenue: float = 0
    cogs: float = 0
    selling_exp: float = 0
    admin_exp: float = 0
    interest_exp: float = 0
    tax: float = 0
    depreciation: float = 0
    capex: float = 0
    cf_op_in: float = 0
    cf_op_out: float = 0
    cf_inv_in: float = 0
    cf_inv_out: float = 0
    cf_fin_in: float = 0
    cf_fin_out: float = 0


@dataclass
class ComputedMetrics:
    # Balance aggregates
    non_current_assets: float = 0
    current_assets: float = 0
    total_assets: float = 0
    equity: float = 0
    lt_debt: float = 0
    st_debt: float = 0
    total_liabilities: float = 0

    # PNL
    gross_profit: float = 0
    ebit: float = 0
    ebt: float = 0
    net_profit: float = 0

    # Liquidity
    current_ratio: float = 0
    quick_ratio: float = 0
    absolute_ratio: float = 0

    # Stability
    autonomy: float = 0
    debt_to_equity: float = 0
    fixed_assets_coverage: float = 0
    working_capital_ratio: float = 0

    # Activity
    asset_turnover: float = 0
    receivables_days: float = 0
    inventory_days: float = 0
    payables_days: float = 0

    # Profitability
    gross_margin: float = 0
    ebit_margin: float = 0
    net_margin: float = 0
    roe: float = 0
    roa: float = 0
    roic: float = 0
    financial_leverage: float = 0

    # Cash flow
    cf_operating: float = 0
    cf_investing: float = 0
    cf_financing: float = 0
    cf_net: float = 0
    fcf: float = 0

    # Score
    health_score: int = 0
    health_label: str = ""


def compute(d: FinancialData) -> ComputedMetrics:
    m = ComputedMetrics()

    # Balance
    m.non_current_assets = d.fixed_assets + d.intangibles
    m.current_assets = d.inventory + d.receivables + d.cash + d.other_current
    m.total_assets = m.non_current_assets + m.current_assets
    m.equity = d.equity_share + d.retained_earnings
    m.lt_debt = d.lt_loans + d.lt_other
    m.st_debt = d.st_loans + d.payables + d.st_other
    m.total_liabilities = m.lt_debt + m.st_debt

    # PNL
    m.gross_profit = d.revenue - d.cogs
    m.ebit = m.gross_profit - d.selling_exp - d.admin_exp
    m.ebt = m.ebit - d.interest_exp
    m.net_profit = m.ebt - d.tax

    # Liquidity
    if m.st_debt > 0:
        m.current_ratio = m.current_assets / m.st_debt
        m.quick_ratio = (d.receivables + d.cash) / m.st_debt
        m.absolute_ratio = d.cash / m.st_debt

    # Stability
    if m.total_assets > 0:
        m.autonomy = m.equity / m.total_assets
    if m.equity > 0:
        m.debt_to_equity = (m.lt_debt + m.st_debt) / m.equity
        m.fixed_assets_coverage = m.equity / m.non_current_assets if m.non_current_assets > 0 else 0
    if m.current_assets > 0:
        m.working_capital_ratio = (m.equity - m.non_current_assets) / m.current_assets

    # Activity
    if m.total_assets > 0:
        m.asset_turnover = d.revenue / m.total_assets
    if d.revenue > 0:
        m.receivables_days = (d.receivables / d.revenue) * 365
    if d.cogs > 0:
        m.inventory_days = (d.inventory / d.cogs) * 365
        m.payables_days = (d.payables / d.cogs) * 365

    # Profitability
    if d.revenue > 0:
        m.gross_margin = (m.gross_profit / d.revenue) * 100
        m.ebit_margin = (m.ebit / d.revenue) * 100
        m.net_margin = (m.net_profit / d.revenue) * 100
    if m.equity > 0:
        m.roe = (m.net_profit / m.equity) * 100
    if m.total_assets > 0:
        m.roa = (m.net_profit / m.total_assets) * 100
    invested_capital = m.equity + m.lt_debt
    if invested_capital > 0:
        m.roic = (m.ebit * 0.8 / invested_capital) * 100
    if m.equity > 0:
        m.financial_leverage = m.total_assets / m.equity

    # Cash flow
    m.cf_operating = d.cf_op_in - d.cf_op_out
    m.cf_investing = d.cf_inv_in - d.cf_inv_out
    m.cf_financing = d.cf_fin_in - d.cf_fin_out
    m.cf_net = m.cf_operating + m.cf_investing + m.cf_financing
    m.fcf = m.cf_operating - d.capex

    # Health score (0-5)
    checks = [
        m.current_ratio >= 1.5,
        m.autonomy >= 0.5,
        m.net_margin >= 10,
        m.roe >= 15,
        m.asset_turnover >= 1.0,
    ]
    m.health_score = sum(checks)
    if m.health_score >= 4:
        m.health_label = "Хорошее"
    elif m.health_score >= 3:
        m.health_label = "Удовлетворительное"
    else:
        m.health_label = "Требует внимания"

    return m


def metrics_to_dict(m: ComputedMetrics) -> dict:
    return {k: round(v, 4) if isinstance(v, float) else v
            for k, v in m.__dict__.items()}
