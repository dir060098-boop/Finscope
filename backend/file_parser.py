import io
import pandas as pd
from typing import Tuple

FIELD_MAP = {
    "выручка": "revenue", "revenue": "revenue",
    "себестоимость": "cogs", "cogs": "cogs",
    "коммерческие": "selling_exp", "selling": "selling_exp", "коммерч": "selling_exp",
    "управленческие": "admin_exp", "admin": "admin_exp", "управл": "admin_exp",
    "проценты": "interest_exp", "interest": "interest_exp",
    "налог": "tax", "tax": "tax",
    "амортизация": "depreciation", "depreciation": "depreciation",
    "capex": "capex", "капвложения": "capex",
    "ос": "fixed_assets", "основные средства": "fixed_assets", "fixed assets": "fixed_assets",
    "нма": "intangibles", "intangibles": "intangibles",
    "запасы": "inventory", "inventory": "inventory",
    "дз": "receivables", "дебиторка": "receivables", "receivables": "receivables",
    "дебиторская задолженность": "receivables",
    "деньги": "cash", "cash": "cash", "денежные средства": "cash",
    "прочие_об": "other_current", "прочие оборотные": "other_current",
    "ук": "equity_share", "уставный капитал": "equity_share",
    "нп": "retained_earnings", "нераспределённая прибыль": "retained_earnings",
    "lt": "lt_loans", "lt loans": "lt_loans", "долгосрочные кредиты": "lt_loans",
    "lt2": "lt_other",
    "st": "st_loans", "st loans": "st_loans", "краткосрочные займы": "st_loans",
    "кз": "payables", "кредиторка": "payables", "payables": "payables",
    "кредиторская задолженность": "payables",
    "st2": "st_other",
    "cf_op_in": "cf_op_in", "cf_op_out": "cf_op_out",
    "cf_inv_in": "cf_inv_in", "cf_inv_out": "cf_inv_out",
    "cf_fin_in": "cf_fin_in", "cf_fin_out": "cf_fin_out",
}


def parse_upload(content: bytes, filename: str) -> Tuple[dict, dict]:
    """Returns (mapped_data, preview_with_labels)"""
    ext = filename.rsplit(".", 1)[-1].lower()
    result = {}

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(content), header=None, names=["key", "value"])
        else:
            df = pd.read_excel(io.BytesIO(content), header=None, names=["key", "value"])

        for _, row in df.iterrows():
            if pd.isna(row["key"]) or pd.isna(row["value"]):
                continue
            key = str(row["key"]).strip().lower()
            try:
                val = float(str(row["value"]).replace(" ", "").replace(",", "."))
            except ValueError:
                continue
            mapped = FIELD_MAP.get(key)
            if mapped:
                result[mapped] = val

    except Exception as e:
        raise ValueError(f"Ошибка чтения файла: {e}")

    preview = {k: round(v) for k, v in result.items()}
    return result, preview
