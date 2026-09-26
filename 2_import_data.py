# -*- coding: utf-8 -*-
import os, json, hashlib, re
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.field_path import FieldPath
from google.cloud.firestore_v1.transforms import DELETE_FIELD

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "wholesale_data.json")
SERVICE_ACCOUNT_FILE = os.path.join(BASE_DIR, "serviceAccount.json")
COLLECTION_NAME = "wholesale_products"
DROP_KEYS = {"soldSynced", "variantsConfirmed", "clickVerified"}

def sold_label(raw):
    n = re.sub(r"[^\d]", "", str(raw or ""))
    if not n or int(n) <= 0:
        return ""
    return "Đã bán " + str(int(n))

def get_raw_category(item):
    cat = item.get("category", "")
    return str(cat).strip() if cat and str(cat).strip() else "Chưa phân loại"

def make_doc_id(item, idx):
    item_id = str(item.get("id", "")).strip()
    sku = str(item.get("sku", "")).strip()
    if item_id:
        return item_id
    if sku:
        return sku
    name = str(item.get("name", "")).strip()
    digest = hashlib.sha1(f"{name}|{get_raw_category(item)}".encode("utf-8")).hexdigest()[:12]
    return f"SP_AUTO_{idx:06d}_{digest}"

def clean_product(item):
    """Bỏ ô thừa, số đã bán bằng 0, cờ nội bộ của tool cào."""
    raw_sold = ""
    seller_in = item.get("seller") if isinstance(item.get("seller"), dict) else {}
    raw_sold = seller_in.get("sold") or item.get("sold") or item.get("seller.sold") or ""
    sold = sold_label(raw_sold)
    out = {}
    for key, value in item.items():
        if "." in key or key in DROP_KEYS:
            continue
        if key in ("sold", "seller"):
            continue
        if key == "variants" and isinstance(value, list):
            rows = []
            for row in value:
                if not isinstance(row, dict):
                    continue
                rows.append({k: v for k, v in row.items() if k not in DROP_KEYS})
            out[key] = rows
            continue
        out[key] = value
    seller = {k: v for k, v in seller_in.items() if k != "sold" and v not in ("", None)}
    sku = str(item.get("sku") or seller.get("sku") or "").strip()
    if sku:
        seller["sku"] = sku
        out["sku"] = sku
    if sold:
        seller["sold"] = sold
        out["sold"] = sold
    if seller:
        out["seller"] = seller
    return out

def run_import():
    print("=" * 65)
    print(" TÂN THÀNH PHÁT - ĐƯA LÊN FIREBASE (chỉ giá trị có ích)")
    print("=" * 65)
    if not os.path.exists(DATA_FILE):
        print(f"[!] Không thấy {DATA_FILE}")
        return
    try:
        with open(DATA_FILE, "r", encoding="utf-8-sig") as f:
            products = json.load(f)
    except Exception as e:
        print(f"[!] Lỗi đọc JSON: {e}")
        return
    products = [p for p in products if isinstance(p, dict)]
    print(f"[*] {len(products)} sản phẩm. Không xóa kho cũ. Gỡ ô thừa seller.sold nếu có.")

    if not firebase_admin._apps:
        try:
            firebase_admin.initialize_app(credentials.Certificate(SERVICE_ACCOUNT_FILE))
        except Exception as e:
            print(f"[!] Lỗi serviceAccount.json: {e}")
            return
    db = firestore.client()
    batch = db.batch()
    pending = 0
    count = 0

    def flush():
        nonlocal batch, pending
        if pending:
            batch.commit()
            batch = db.batch()
            pending = 0

    for idx, item in enumerate(products):
        doc_id = make_doc_id(item, idx)
        ref = db.collection(COLLECTION_NAME).document(doc_id)
        data = clean_product(item)
        data["id"] = doc_id
        data["updatedAt"] = firestore.SERVER_TIMESTAMP
        if "isActive" not in data:
            data["isActive"] = True
        # FieldPath một đoạn: xóa ô TÊN CÓ DẤU CHẤM, không đụng seller.sold lồng bên trong
        data[FieldPath("seller.sold")] = DELETE_FIELD
        if "sold" not in data:
            data["sold"] = DELETE_FIELD
        data["soldSynced"] = DELETE_FIELD
        data["variantsConfirmed"] = DELETE_FIELD
        batch.set(ref, data, merge=True)
        pending += 1
        count += 1
        if pending >= 400:
            flush()
            print(f"  -> {count}/{len(products)}")
    flush()
    print("=" * 65)
    print(f"[*] XONG. Đã ghi {count} sản phẩm. Giá, kho, biến thể trong file được giữ. Ô thừa đã gỡ.")

if __name__ == "__main__":
    run_import()
