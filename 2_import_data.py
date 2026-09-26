# -*- coding: utf-8 -*-
import os, json, hashlib
from collections import Counter
import firebase_admin
from firebase_admin import credentials, firestore

# Định vị đường dẫn tuyệt đối để chống lỗi "File Not Found" khi chạy qua file .bat
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "wholesale_data.json")
SERVICE_ACCOUNT_FILE = os.path.join(BASE_DIR, "serviceAccount.json")
COLLECTION_NAME = "wholesale_products"

def get_raw_category(item):
    cat = item.get("category", "")
    return str(cat).strip() if cat and str(cat).strip() else "Chưa phân loại"

def make_doc_id(item, idx):
    # Ưu tiên lấy ID đồng bộ từ tool cào Shopee v200
    item_id = str(item.get("id", "")).strip()
    sku = str(item.get("sku", "")).strip()
    
    if item_id: return item_id
    if sku: return sku
    
    # Fallback tạo mã băm chống trùng lặp nếu thiếu ID
    name = str(item.get("name", "")).strip()
    identity = f"{name}|{get_raw_category(item)}"
    digest = hashlib.sha1(identity.encode("utf-8")).hexdigest()[:12]
    return f"SP_AUTO_{idx:06d}_{digest}"

def run_import():
    print("="*65)
    print(" TÂN THÀNH PHÁT - FIREBASE UPLOADER v200 FULL ENGINE")
    print("="*65)
    
    if not os.path.exists(DATA_FILE):
        print(f"[!] Lỗi: Không tìm thấy tệp dữ liệu {DATA_FILE}")
        print("    Vui lòng chạy tool cào sản phẩm trước khi import.")
        return

    try:
        with open(DATA_FILE, "r", encoding="utf-8-sig") as f:
            products = json.load(f)
    except Exception as e:
        print(f"[!] Lỗi đọc tệp JSON: {e}")
        return

    print(f"[*] Tìm thấy {len(products)} sản phẩm trong JSON.")
    
    # Thống kê nhanh danh mục trước khi đẩy
    print("[*] Phân bổ danh mục:")
    categories = Counter(get_raw_category(i) for i in products if isinstance(i, dict))
    for cat, cnt in categories.most_common(10):
        print(f"  - {cat}: {cnt} sản phẩm")

    # 1. Khởi tạo quyền Admin Firebase
    if not firebase_admin._apps:
        try:
            cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"[!] Lỗi kết nối Firebase (kiểm tra lại serviceAccount.json): {e}")
            return
            
    db = firestore.client()

    # Không xóa kho. File xuất cũ thiếu biến thể/ảnh/video,
    # ghi đè cả document sẽ làm mất phần đó.
    print("\n[*] Gộp vào dữ liệu đang có, không xóa gian hàng...")
    batch = db.batch()
    count = 0
    ops = 0

    for idx, item in enumerate(products):
        if not isinstance(item, dict):
            continue
        sku = str(item.get("sku") or "").strip()
        doc_id = make_doc_id(item, idx)
        doc_ref = db.collection(COLLECTION_NAME).document(doc_id)
        if not doc_ref.get().exists and sku:
            found = list(db.collection(COLLECTION_NAME).where("sku", "==", sku).limit(1).stream())
            if found:
                doc_ref = found[0].reference
        payload = dict(item)
        payload.pop("_id", None)
        payload["updatedAt"] = firestore.SERVER_TIMESTAMP
        payload["isActive"] = payload.get("isActive", True)
        # Bản xuất rút gọn không có các khóa này: giữ nguyên trên Firebase.
        for key in ("variants", "images", "videos", "media", "descriptionHtml", "specifications", "breadcrumbs"):
            if key not in payload or payload[key] in (None, [], {}):
                payload.pop(key, None)
        batch.set(doc_ref, payload, merge=True)
        count += 1
        ops += 1
        if ops >= 400:
            batch.commit()
            print(f"  -> Đã gộp {count}/{len(products)} sản phẩm...")
            batch = db.batch()
            ops = 0

    if ops:
        batch.commit()
        
    print("="*65)
    print(f"[*] XONG! Đã đồng bộ thành công {count} sản phẩm lên gian hàng Tân Thành Phát.")

if __name__ == "__main__":
    run_import()