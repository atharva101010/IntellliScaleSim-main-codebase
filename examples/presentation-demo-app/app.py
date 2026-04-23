import hashlib
import math
import random
import string
import threading
import time
from datetime import datetime, timezone
from typing import Dict, List

from flask import Flask, jsonify, request

app = Flask(__name__)

CATALOG: List[Dict] = [
    {
        "id": i,
        "sku": f"SKU-{1000 + i}",
        "name": f"Cloud Widget {i}",
        "price": round(9.99 + (i * 0.73), 2),
        "category": random.choice(["compute", "storage", "network", "security"]),
        "rating": round(random.uniform(3.8, 5.0), 1),
        "stock": random.randint(8, 250),
    }
    for i in range(1, 601)
]

stats_lock = threading.Lock()
service_stats = {
    "request_count": 0,
    "checkout_count": 0,
    "search_count": 0,
    "cpu_tasks": 0,
    "memory_tasks": 0,
    "io_tasks": 0,
    "error_count": 0,
    "total_latency_ms": 0.0,
    "max_latency_ms": 0.0,
    "started_at": datetime.now(timezone.utc).isoformat(),
}


def clamp_int(value: str, minimum: int, maximum: int, default: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, parsed))


def jitter_sleep(min_ms: int = 20, max_ms: int = 140) -> None:
    time.sleep(random.uniform(min_ms / 1000.0, max_ms / 1000.0))


@app.before_request
def track_start_time() -> None:
    request._started_at = time.perf_counter()


@app.after_request
def track_stats(response):
    started = getattr(request, "_started_at", None)
    if started is None:
        return response

    latency_ms = (time.perf_counter() - started) * 1000.0
    with stats_lock:
        service_stats["request_count"] += 1
        service_stats["total_latency_ms"] += latency_ms
        if latency_ms > service_stats["max_latency_ms"]:
            service_stats["max_latency_ms"] = latency_ms

    return response


@app.errorhandler(Exception)
def on_error(err):
    with stats_lock:
        service_stats["error_count"] += 1
    return jsonify({"error": str(err)}), 500


@app.get("/")
def home():
    return jsonify(
        {
            "service": "IntelliScaleSim Presentation Demo App",
            "description": "E-commerce style API with realistic traffic and stress endpoints",
            "version": "1.0.0",
            "endpoints": [
                "/healthz",
                "/api/catalog",
                "/api/search?q=widget",
                "/api/checkout (POST)",
                "/api/work/cpu",
                "/api/work/memory",
                "/api/work/io",
                "/metrics",
            ],
        }
    )


@app.get("/healthz")
def healthz():
    return jsonify({"status": "ok", "time": datetime.now(timezone.utc).isoformat()})


@app.get("/api/catalog")
def catalog():
    page = clamp_int(request.args.get("page", "1"), 1, 1000, 1)
    page_size = clamp_int(request.args.get("page_size", "20"), 1, 100, 20)

    start = (page - 1) * page_size
    end = start + page_size
    items = CATALOG[start:end]

    # Simulate DB/network variability.
    jitter_sleep(30, 120)

    return jsonify(
        {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total": len(CATALOG),
            "has_next": end < len(CATALOG),
        }
    )


@app.get("/api/search")
def search():
    query = (request.args.get("q") or "").strip().lower()
    limit = clamp_int(request.args.get("limit", "15"), 1, 50, 15)

    with stats_lock:
        service_stats["search_count"] += 1

    if not query:
        return jsonify({"items": [], "query": "", "count": 0})

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

    return jsonify({"items": result[:limit], "query": query, "count": len(result)})


@app.post("/api/checkout")
def checkout():
    payload = request.get_json(silent=True) or {}
    cart_items = payload.get("items", [])

    with stats_lock:
        service_stats["checkout_count"] += 1

    # Simulate payment + fraud checks with CPU and latency.
    rounds = clamp_int(str(payload.get("fraud_check_rounds", "15000")), 2000, 120000, 15000)
    risk_seed = f"{payload.get('user_id', 'guest')}:{cart_items}:{time.time_ns()}".encode("utf-8")
    digest = risk_seed
    for _ in range(rounds):
        digest = hashlib.sha256(digest).digest()

    cart_total = 0.0
    for item in cart_items:
        qty = max(1, int(item.get("qty", 1)))
        price = float(item.get("price", 9.99))
        cart_total += qty * price

    jitter_sleep(90, 260)

    return jsonify(
        {
            "order_id": f"ORD-{int(time.time())}-{random.randint(100, 999)}",
            "status": "confirmed",
            "items_count": len(cart_items),
            "charged_total": round(cart_total * 1.08, 2),
            "risk_bucket": digest[0] % 5,
            "estimated_delivery_days": random.randint(2, 6),
        }
    )


@app.get("/api/work/cpu")
def cpu_work():
    complexity = clamp_int(request.args.get("complexity", "4500"), 800, 12000, 4500)

    with stats_lock:
        service_stats["cpu_tasks"] += 1

    # Prime-like numeric loop to create deterministic CPU pressure.
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

    return jsonify({"task": "cpu", "complexity": complexity, "score": round(score, 2)})


@app.get("/api/work/memory")
def memory_work():
    size_mb = clamp_int(request.args.get("size_mb", "30"), 5, 250, 30)
    hold_ms = clamp_int(request.args.get("hold_ms", "700"), 100, 5000, 700)

    with stats_lock:
        service_stats["memory_tasks"] += 1

    # Allocate temporary memory block to stress RAM metrics.
    block = ["".join(random.choices(string.ascii_letters, k=1024)) for _ in range(size_mb * 1024)]
    checksum = hashlib.md5("".join(block[:200]).encode("utf-8")).hexdigest()[:16]
    time.sleep(hold_ms / 1000.0)

    return jsonify(
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

    with stats_lock:
        service_stats["io_tasks"] += 1

    data = "".join(random.choices(string.ascii_letters + string.digits, k=size_kb * 1024))
    digest = hashlib.sha256(data.encode("utf-8")).hexdigest()
    jitter_sleep(25, 80)

    return jsonify({"task": "io", "size_kb": size_kb, "sha256": digest[:24]})


@app.get("/metrics")
def metrics():
    with stats_lock:
        request_count = service_stats["request_count"]
        avg_latency = (
            service_stats["total_latency_ms"] / request_count if request_count else 0.0
        )

        lines = [
            "# HELP demo_requests_total Total requests served",
            "# TYPE demo_requests_total counter",
            f"demo_requests_total {request_count}",
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
        return jsonify(
            {
                "service": "presentation-demo-app",
                "started_at": service_stats["started_at"],
                "request_count": request_count,
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
