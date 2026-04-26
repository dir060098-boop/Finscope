from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os, io, re

from database import get_db, engine
import models, schemas
from calculations import compute, FinancialData, metrics_to_dict
from auth import (
    get_current_user, create_access_token,
    hash_password, verify_password
)
from pdf_generator import generate_pdf
from ai_service import get_ai_analysis, get_ai_chat
from file_parser import parse_upload

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="FinScope API", version="1.0.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── AUTH ────────────────────────────────────────────
@app.post("/api/auth/register", response_model=schemas.Token)
def register(data: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    slug = re.sub(r"[^a-z0-9]", "-", data.company_name.lower())[:50]
    # ensure unique slug
    existing = db.query(models.Company).filter(models.Company.slug == slug).first()
    if existing:
        slug = f"{slug}-{db.query(models.Company).count()}"
    company = models.Company(name=data.company_name, industry=data.industry, slug=slug)
    db.add(company)
    db.flush()
    user = models.User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role="admin",
        company_id=company.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "company_id": company.id})
    return {"access_token": token}


@app.post("/api/auth/login", response_model=schemas.Token)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token({"sub": str(user.id), "company_id": user.company_id})
    return {"access_token": token}


@app.get("/api/auth/me", response_model=schemas.UserOut)
def me(user=Depends(get_current_user)):
    return user


# ─── COMPANY ─────────────────────────────────────────
@app.get("/api/company", response_model=schemas.CompanyOut)
def get_company(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Company).filter(models.Company.id == user.company_id).first()


# ─── PERIODS ─────────────────────────────────────────
@app.get("/api/periods", response_model=list[schemas.PeriodOut])
def list_periods(user=Depends(get_current_user), db: Session = Depends(get_db)):
    periods = (
        db.query(models.Period)
        .filter(models.Period.company_id == user.company_id)
        .order_by(models.Period.created_at)
        .all()
    )
    result = []
    for p in periods:
        d = _period_to_out(p)
        result.append(d)
    return result


@app.post("/api/periods", response_model=schemas.PeriodOut)
def create_period(data: schemas.PeriodCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    period = models.Period(
        company_id=user.company_id,
        name=data.name,
        period_type=data.period_type,
        comment=data.comment
    )
    db.add(period)
    db.flush()
    fin = models.Financials(period_id=period.id, **data.financials.model_dump())
    db.add(fin)
    db.commit()
    db.refresh(period)
    return _period_to_out(period)


@app.put("/api/periods/{period_id}", response_model=schemas.PeriodOut)
def update_period(period_id: int, data: schemas.PeriodUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    period = _get_period(period_id, user.company_id, db)
    if data.name:
        period.name = data.name
    if data.comment is not None:
        period.comment = data.comment
    if data.financials:
        fin_data = data.financials.model_dump()
        if period.financials:
            for k, v in fin_data.items():
                setattr(period.financials, k, v)
        else:
            period.financials = models.Financials(period_id=period.id, **fin_data)
    db.commit()
    db.refresh(period)
    return _period_to_out(period)


@app.delete("/api/periods/{period_id}")
def delete_period(period_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    period = _get_period(period_id, user.company_id, db)
    db.delete(period)
    db.commit()
    return {"ok": True}


@app.get("/api/periods/{period_id}/metrics")
def get_metrics(period_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    period = _get_period(period_id, user.company_id, db)
    if not period.financials:
        raise HTTPException(404, "No financials")
    fd = _fin_to_fd(period.financials)
    m = compute(fd)
    return metrics_to_dict(m)


# ─── AI ──────────────────────────────────────────────
@app.post("/api/ai/analysis")
async def ai_analysis(req: schemas.AIAnalysisRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    period = _get_period(req.period_id, user.company_id, db)
    fd = _fin_to_fd(period.financials)
    m = compute(fd)
    company = db.query(models.Company).filter(models.Company.id == user.company_id).first()
    text = await get_ai_analysis(period, fd, m, company)
    return {"analysis": text}


@app.post("/api/ai/chat")
async def ai_chat(req: schemas.AIChatRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    period = _get_period(req.period_id, user.company_id, db)
    fd = _fin_to_fd(period.financials)
    m = compute(fd)
    reply = await get_ai_chat(req.message, req.history, period, fd, m)
    return {"reply": reply}


# ─── SCENARIOS ───────────────────────────────────────
@app.post("/api/scenarios")
def run_scenario(req: schemas.ScenarioRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    period = _get_period(req.period_id, user.company_id, db)
    fd = _fin_to_fd(period.financials)
    base = compute(fd)

    # Apply changes
    import copy
    fd2 = copy.deepcopy(fd)
    fd2.revenue *= (1 + req.revenue_change_pct / 100)
    fd2.cogs *= (1 + req.cogs_change_pct / 100)
    fd2.selling_exp *= (1 + req.opex_change_pct / 100)
    fd2.admin_exp *= (1 + req.opex_change_pct / 100)
    fd2.interest_exp += req.extra_loan * (req.loan_rate_pct / 100)
    fd2.lt_loans += req.extra_loan
    fd2.cash += req.extra_loan
    scenario = compute(fd2)

    return {
        "base": metrics_to_dict(base),
        "scenario": metrics_to_dict(scenario),
        "params": req.model_dump()
    }


# ─── FILE IMPORT ──────────────────────────────────────
@app.post("/api/import/preview")
async def import_preview(file: UploadFile = File(...), user=Depends(get_current_user)):
    content = await file.read()
    result, preview = parse_upload(content, file.filename)
    return {"mapped_fields": len(result), "total_fields": 27, "preview": preview, "data": result}


# ─── PDF ─────────────────────────────────────────────
@app.get("/api/periods/{period_id}/pdf")
async def get_pdf(period_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    period = _get_period(period_id, user.company_id, db)
    company = db.query(models.Company).filter(models.Company.id == user.company_id).first()
    fd = _fin_to_fd(period.financials)
    m = compute(fd)
    all_periods = (
        db.query(models.Period)
        .filter(models.Period.company_id == user.company_id)
        .order_by(models.Period.created_at)
        .all()
    )
    pdf_path = await generate_pdf(period, company, fd, m, all_periods)
    return FileResponse(pdf_path, media_type="application/pdf",
                        filename=f"finscope_{period.name.replace(' ', '_')}.pdf")


# ─── HELPERS ─────────────────────────────────────────
def _get_period(period_id: int, company_id: int, db: Session) -> models.Period:
    period = db.query(models.Period).filter(
        models.Period.id == period_id,
        models.Period.company_id == company_id
    ).first()
    if not period:
        raise HTTPException(404, "Period not found")
    return period


def _fin_to_fd(fin: Optional[models.Financials]) -> FinancialData:
    if not fin:
        return FinancialData()
    return FinancialData(
        fixed_assets=fin.fixed_assets, intangibles=fin.intangibles,
        inventory=fin.inventory, receivables=fin.receivables,
        cash=fin.cash, other_current=fin.other_current,
        equity_share=fin.equity_share, retained_earnings=fin.retained_earnings,
        lt_loans=fin.lt_loans, lt_other=fin.lt_other,
        st_loans=fin.st_loans, payables=fin.payables, st_other=fin.st_other,
        revenue=fin.revenue, cogs=fin.cogs,
        selling_exp=fin.selling_exp, admin_exp=fin.admin_exp,
        interest_exp=fin.interest_exp, tax=fin.tax,
        depreciation=fin.depreciation, capex=fin.capex,
        cf_op_in=fin.cf_op_in, cf_op_out=fin.cf_op_out,
        cf_inv_in=fin.cf_inv_in, cf_inv_out=fin.cf_inv_out,
        cf_fin_in=fin.cf_fin_in, cf_fin_out=fin.cf_fin_out,
    )


def _period_to_out(period: models.Period) -> dict:
    fd = _fin_to_fd(period.financials)
    m = compute(fd)
    fin_dict = None
    if period.financials:
        fin_dict = {c.name: getattr(period.financials, c.name)
                    for c in period.financials.__table__.columns}
    return {
        "id": period.id,
        "name": period.name,
        "period_type": period.period_type,
        "comment": period.comment or "",
        "created_at": period.created_at,
        "updated_at": period.updated_at,
        "financials": fin_dict,
        "metrics": metrics_to_dict(m)
    }
