from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ─── Auth ───────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: str
    industry: str = "general"

class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    company_id: int
    model_config = {"from_attributes": True}


# ─── Company ────────────────────────────────────────
class CompanyOut(BaseModel):
    id: int
    name: str
    industry: str
    slug: str
    model_config = {"from_attributes": True}


# ─── Financials ─────────────────────────────────────
class FinancialsIn(BaseModel):
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


class FinancialsOut(FinancialsIn):
    id: int
    period_id: int
    model_config = {"from_attributes": True}


# ─── Period ─────────────────────────────────────────
class PeriodCreate(BaseModel):
    name: str
    period_type: str = "annual"
    comment: str = ""
    financials: FinancialsIn = FinancialsIn()

class PeriodUpdate(BaseModel):
    name: Optional[str] = None
    comment: Optional[str] = None
    financials: Optional[FinancialsIn] = None

class PeriodOut(BaseModel):
    id: int
    name: str
    period_type: str
    comment: str
    created_at: datetime
    updated_at: datetime
    financials: Optional[FinancialsOut] = None
    metrics: Optional[dict] = None
    model_config = {"from_attributes": True}


# ─── AI ─────────────────────────────────────────────
class AIAnalysisRequest(BaseModel):
    period_id: int
    language: str = "ru"

class AIChatRequest(BaseModel):
    period_id: int
    message: str
    history: list[dict] = []


# ─── Scenarios ──────────────────────────────────────
class ScenarioRequest(BaseModel):
    period_id: int
    revenue_change_pct: float = 0
    cogs_change_pct: float = 0
    opex_change_pct: float = 0
    extra_loan: float = 0
    loan_rate_pct: float = 15.0


# ─── Import ─────────────────────────────────────────
class ImportResult(BaseModel):
    mapped_fields: int
    total_fields: int
    preview: dict
