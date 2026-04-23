import hashlib
import logging
import math
import os
import random
import string
import threading
import time
from datetime import datetime, timezone
from http import HTTPStatus
from typing import Dict, List
from uuid import uuid4

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

APP_NAME = "IntelliScaleSim Presentation Demo App"
APP_VERSION = os.getenv("APP_VERSION", "1.1.0")
ENVIRONMENT = os.getenv("APP_ENV", "production")

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("presentation-demo-app")

app = Flask(__name__)


class ApiError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def response_ok(data: Dict, status_code: int = 200):
    payload = {
        "success": True,
        "data": data,
        "meta": {
            "request_id": getattr(request, "_request_id", "unknown"),
            "timestamp": utc_now_iso(),
        },
    }
    return jsonify(payload), status_code


def response_error(message: str, status_code: int):
    payload = {
        "success": False,
        "error": {
            "code": status_code,
            "message": message,
        },
        "meta": {
            "request_id": getattr(request, "_request_id", "unknown"),
            "timestamp": utc_now_iso(),
        },
    }
    return jsonify(payload), status_code


def clamp_int(value: str, minimum: int, maximum: int, default: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def jitter_sleep(min_ms: int = 20, max_ms: int = 140) -> None:
    time.sleep(random.uniform(min_ms / 1000.0, max_ms / 1000.0))


def generate_catalog(size: int = 600) -> List[Dict]:
    catalog_rng = random.Random(42)
    categories = ["compute", "storage", "network", "security"]
    return [
        {
            "id": i,
            "sku": f"SKU-{1000 + i}",
            "name": f"Cloud Widget {i}",
            "price": round(9.99 + (i * 0.73), 2),
            "category": catalog_rng.choice(categories),
            "rating": round(catalog_rng.uniform(3.8, 5.0), 1),
            "stock": catalog_rng.randint(8, 250),
        }
        for i in range(1, size + 1)
    ]


CATALOG: List[Dict] = generate_catalog()

stats_lock = threading.Lock()
service_stats = {
    "request_count": 0,
    "active_requests": 0,
    "checkout_count": 0,
    "search_count": 0,
    "cpu_tasks": 0,
    "memory_tasks": 0,
    "io_tasks": 0,
    "error_count": 0,
    "total_latency_ms": 0.0,
    "max_latency_ms": 0.0,
    "started_at": utc_now_iso(),
}


def increment_stat(key: str) -> None:
    with stats_lock:
        service_stats[key] += 1


@app.before_request
def before_request() -> None:
    request._started_at = time.perf_counter()
    request._request_id = request.headers.get("X-Request-Id") or str(uuid4())
    with stats_lock:
        service_stats["active_requests"] += 1


@app.after_request
def after_request(response):
    started = getattr(request, "_started_at", None)
    if started is None:
        return response

    latency_ms = (time.perf_counter() - started) * 1000.0
    with stats_lock:
        service_stats["request_count"] += 1
        service_stats["active_requests"] = max(0, service_stats["active_requests"] - 1)
        service_stats["total_latency_ms"] += latency_ms
        if latency_ms > service_stats["max_latency_ms"]:
            service_stats["max_latency_ms"] = latency_ms

    response.headers["X-Request-Id"] = getattr(request, "_request_id", "unknown")
    response.headers["X-Response-Time-Ms"] = f"{latency_ms:.2f}"
    return response


@app.errorhandler(ApiError)
def handle_api_error(err: ApiError):
    increment_stat("error_count")
    return response_error(err.message, err.status_code)


@app.errorhandler(HTTPException)
def handle_http_error(err: HTTPException):
    increment_stat("error_count")
    return response_error(err.description, err.code or 500)


@app.errorhandler(Exception)
def handle_unexpected_error(err: Exception):
    increment_stat("error_count")
    logger.exception("Unhandled error: %s", err)
    return response_error("Internal server error", HTTPStatus.INTERNAL_SERVER_ERROR)


@app.get("/")
def home():
    return response_ok(
        {
            "service": APP_NAME,
            "description": "E-commerce style API with realistic traffic and stress endpoints",
            "version": APP_VERSION,
            "environment": ENVIRONMENT,
            "endpoints": [
                "/healthz",
                "/readyz",
                "/api/catalog",
                "/api/search?q=widget",
                "/api/checkout (POST)",
                "/api/work/cpu",
                "/api/work/memory",
                "/api/work/io",
                "/api/stats",
                "/metrics",
            ],
        }
    )


@app.get("/healthz")
def healthz():
    return response_ok({"status": "ok", "time": utc_now_iso()})


@app.get("/readyz")
def readyz():
    return response_ok({"status": "ready", "time": utc_now_iso()})


@app.get("/api/catalog")
def catalog():
    page = clamp_int(request.args.get("page", "1"), 1, 1000, 1)
    page_size = clamp_int(request.args.get("page_size", "20"), 1, 100, 20)
    category_filter = (request.args.get("category") or "").strip().lower()
    sort = (request.args.get("sort") or "id").strip().lower()

    if sort not in {"id", "price", "rating"}:
        raise ApiError(400, "Invalid sort. Use one of: id, price, rating")

    items = CATALOG
    if category_filter:
        items = [item for item in CATALOG if item["category"] == category_filter]

    reverse = sort in {"price", "rating"}
    items = sorted(items, key=lambda x: x[sort], reverse=reverse)

    start = (page - 1) * page_size
    end = start + page_size
    paged = items[start:end]
    jitter_sleep(30, 120)

    return response_ok(
        {
            "items": paged,
            "page": page,
            "page_size": page_size,
            "total": len(items),
            "has_next": end < len(items),
            "filters": {"category": category_filter or None, "sort": sort},
        }
    )


@app.get("/api/search")
def search():
    query = (request.args.get("q") or "").strip().lower()
    limit = clamp_int(request.args.get("limit", "15"), 1, 50, 15)
    increment_stat("search_count")

    if not query:
        return response_ok({"items": [], "query": "", "count": 0})

    tokens = query.split()
    result = []
    for item in CATALOG:
        haystack = f"{item['name']} {item['category']} {item['sku']}".lower()
        score = sum(1 for token in tokens if token in haystack)
        if score > 0:
            enriched = dict(item)
            enriched["match_score"] = score
            result.append(enriched)

    result.sort(key=lambda x: (-x["match_score"], -x["rating"]))
    jitter_sleep(40, 160)
    return response_ok({"items": result[:limit], "query": query, "count": len(result)})


def validate_checkout_payload(payload: Dict) -> List[Dict]:
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        raise ApiError(400, "items must be a non-empty array")

    validated_items: List[Dict] = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise ApiError(400, f"items[{index}] must be an object")
        sku = str(item.get("sku", "")).strip()
        if not sku:
            raise ApiError(400, f"items[{index}].sku is required")

        try:
            qty = int(item.get("qty", 1))
        except (TypeError, ValueError):
            raise ApiError(400, f"items[{index}].qty must be an integer")
        if qty < 1 or qty > 1000:
            raise ApiError(400, f"items[{index}].qty must be between 1 and 1000")

        try:
            price = float(item.get("price", 0))
        except (TypeError, ValueError):
            raise ApiError(400, f"items[{index}].price must be numeric")
        if price <= 0:
            raise ApiError(400, f"items[{index}].price must be greater than 0")

        validated_items.append({"sku": sku, "qty": qty, "price": price})

    return validated_items


@app.post("/api/checkout")
def checkout():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ApiError(400, "Request body must be valid JSON object")

    items = validate_checkout_payload(payload)
    increment_stat("checkout_count")

    rounds = clamp_int(str(payload.get("fraud_check_rounds", "15000")), 2000, 120000, 15000)
    risk_seed = f"{payload.get('user_id', 'guest')}:{items}:{time.time_ns()}".encode("utf-8")
    digest = risk_seed
    for _ in range(rounds):
        digest = hashlib.sha256(digest).digest()

    subtotal = sum(item["qty"] * item["price"] for item in items)
    tax = subtotal * 0.08
    total = subtotal + tax
    jitter_sleep(90, 260)

    return response_ok(
        {
            "order_id": f"ORD-{int(time.time())}-{random.randint(100, 999)}",
            "status": "confirmed",
            "items_count": len(items),
            "subtotal": round(subtotal, 2),
            "tax": round(tax, 2),
            "charged_total": round(total, 2),
            "risk_bucket": digest[0] % 5,
            "estimated_delivery_days": random.randint(2, 6),
        },
        status_code=201,
    )


@app.get("/api/work/cpu")
def cpu_work():
    complexity = clamp_int(request.args.get("complexity", "4500"), 800, 12000, 4500)
    increment_stat("cpu_tasks")

    score = 0.0
    for n in range(2, complexity):
        prime = True
        root = int(math.sqrt(n))
        for i in range(2, root + 1):
            if n % i == 0:
                prime = False
                break
        if prime:
            score += math.log(n)

    return response_ok({"task": "cpu", "complexity": complexity, "score": round(score, 2)})


@app.get("/api/work/memory")
def memory_work():
    size_mb = clamp_int(request.args.get("size_mb", "30"), 5, 250, 30)
    hold_ms = clamp_int(request.args.get("hold_ms", "700"), 100, 5000, 700)
    increment_stat("memory_tasks")

    block = ["".join(random.choices(string.ascii_letters, k=1024)) for _ in range(size_mb * 1024)]
    checksum = hashlib.md5("".join(block[:200]).encode("utf-8")).hexdigest()[:16]
    time.sleep(hold_ms / 1000.0)

    return response_ok(
        {
            "task": "memory",
            "allocated_mb": size_mb,
            "hold_ms": hold_ms,
            "checksum": checksum,
        }
    )


@app.get("/api/work/io")
def io_work():
    size_kb = clamp_int(request.args.get("size_kb", "512"), 64, 4096, 512)
    increment_stat("io_tasks")

    data = "".join(random.choices(string.ascii_letters + string.digits, k=size_kb * 1024))
    digest = hashlib.sha256(data.encode("utf-8")).hexdigest()
    jitter_sleep(25, 80)
    return response_ok({"task": "io", "size_kb": size_kb, "sha256": digest[:24]})


@app.get("/metrics")
def metrics():
    with stats_lock:
        request_count = service_stats["request_count"]
        avg_latency = service_stats["total_latency_ms"] / request_count if request_count else 0.0
        lines = [
            "# HELP demo_requests_total Total requests served",
            "# TYPE demo_requests_total counter",
            f"demo_requests_total {request_count}",
            "# HELP demo_requests_in_progress Current active requests",
            "# TYPE demo_requests_in_progress gauge",
            f"demo_requests_in_progress {service_stats['active_requests']}",
            "# HELP demo_errors_total Total error responses",
            "# TYPE demo_errors_total counter",
            f"demo_errors_total {service_stats['error_count']}",
            "# HELP demo_avg_latency_ms Average request latency in ms",
            "# TYPE demo_avg_latency_ms gauge",
            f"demo_avg_latency_ms {avg_latency:.3f}",
            "# HELP demo_max_latency_ms Maximum request latency in ms",
            "# TYPE demo_max_latency_ms gauge",
            f"demo_max_latency_ms {service_stats['max_latency_ms']:.3f}",
            "# HELP demo_checkout_total Total checkout operations",
            "# TYPE demo_checkout_total counter",
            f"demo_checkout_total {service_stats['checkout_count']}",
            "# HELP demo_search_total Total search operations",
            "# TYPE demo_search_total counter",
            f"demo_search_total {service_stats['search_count']}",
            "# HELP demo_cpu_tasks_total Total CPU task operations",
            "# TYPE demo_cpu_tasks_total counter",
            f"demo_cpu_tasks_total {service_stats['cpu_tasks']}",
            "# HELP demo_memory_tasks_total Total memory task operations",
            "# TYPE demo_memory_tasks_total counter",
            f"demo_memory_tasks_total {service_stats['memory_tasks']}",
            "# HELP demo_io_tasks_total Total IO task operations",
            "# TYPE demo_io_tasks_total counter",
            f"demo_io_tasks_total {service_stats['io_tasks']}",
        ]

    return "\n".join(lines) + "\n", 200, {"Content-Type": "text/plain; version=0.0.4"}


@app.get("/api/stats")
def api_stats():
    with stats_lock:
        request_count = service_stats["request_count"]
        avg_latency = service_stats["total_latency_ms"] / request_count if request_count else 0.0
        return response_ok(
            {
                "service": "presentation-demo-app",
                "version": APP_VERSION,
                "environment": ENVIRONMENT,
                "started_at": service_stats["started_at"],
                "request_count": request_count,
                "active_requests": service_stats["active_requests"],
                "avg_latency_ms": round(avg_latency, 2),
                "max_latency_ms": round(service_stats["max_latency_ms"], 2),
                "checkout_count": service_stats["checkout_count"],
                "search_count": service_stats["search_count"],
                "cpu_tasks": service_stats["cpu_tasks"],
                "memory_tasks": service_stats["memory_tasks"],
                "io_tasks": service_stats["io_tasks"],
                "error_count": service_stats["error_count"],
            }
        )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
