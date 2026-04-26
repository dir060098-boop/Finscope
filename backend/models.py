from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship, DeclarativeBase
from datetime import datetime, timezone


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    industry = Column(String(100), default="general")
    slug = Column(String(100), unique=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="company")
    periods = relationship("Period", back_populates="company", order_by="Period.created_at")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(50), default="accountant")  # accountant | founder | admin
    is_active = Column(Boolean, default=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="users")


class Period(Base):
    __tablename__ = "periods"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String(255), nullable=False)  # "2024 год" / "Q1 2024"
    period_type = Column(String(20), default="annual")  # annual | quarter | month
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="periods")
    financials = relationship("Financials", back_populates="period", uselist=False, cascade="all, delete-orphan")


class Financials(Base):
    __tablename__ = "financials"

    id = Column(Integer, primary_key=True, index=True)
    period_id = Column(Integer, ForeignKey("periods.id"), nullable=False, unique=True)

    # BALANCE — ASSETS
    fixed_assets = Column(Float, default=0)   # Основные средства
    intangibles = Column(Float, default=0)    # НМА
    inventory = Column(Float, default=0)      # Запасы
    receivables = Column(Float, default=0)    # Дебиторка
    cash = Column(Float, default=0)           # Деньги
    other_current = Column(Float, default=0)  # Прочие оборотные

    # BALANCE — LIABILITIES
    equity_share = Column(Float, default=0)   # Уставный капитал
    retained_earnings = Column(Float, default=0)  # Нераспределённая прибыль
    lt_loans = Column(Float, default=0)       # Долгосрочные кредиты
    lt_other = Column(Float, default=0)       # Прочие долгосрочные
    st_loans = Column(Float, default=0)       # Краткосрочные займы
    payables = Column(Float, default=0)       # Кредиторка
    st_other = Column(Float, default=0)       # Прочие краткосрочные

    # PNL
    revenue = Column(Float, default=0)
    cogs = Column(Float, default=0)
    selling_exp = Column(Float, default=0)    # Коммерческие расходы
    admin_exp = Column(Float, default=0)      # Управленческие расходы
    interest_exp = Column(Float, default=0)   # Проценты
    tax = Column(Float, default=0)
    depreciation = Column(Float, default=0)   # Амортизация
    capex = Column(Float, default=0)

    # CASH FLOW
    cf_op_in = Column(Float, default=0)
    cf_op_out = Column(Float, default=0)
    cf_inv_in = Column(Float, default=0)
    cf_inv_out = Column(Float, default=0)
    cf_fin_in = Column(Float, default=0)
    cf_fin_out = Column(Float, default=0)

    period = relationship("Period", back_populates="financials")
