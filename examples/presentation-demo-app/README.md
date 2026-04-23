# Presentation Demo App (IntelliScaleSim)

This is a deploy-ready demo application for your final presentation. It looks like a real e-commerce backend and includes stress endpoints so you can visibly trigger auto-scaling.

## Why this works for demos

- Realistic endpoints: catalog, search, checkout
- Predictable stress endpoints: CPU, memory, and IO
- Health check endpoint for availability proof
- Prometheus-style `/metrics` endpoint
- Small and fast Docker image

## Endpoints

- `GET /` service metadata
- `GET /healthz` health check
- `GET /api/catalog?page=1&page_size=20`
- `GET /api/search?q=widget&limit=15`
- `POST /api/checkout`
- `GET /api/work/cpu?complexity=4500`
- `GET /api/work/memory?size_mb=30&hold_ms=700`
- `GET /api/work/io?size_kb=512`
- `GET /api/stats`
- `GET /metrics`

## Local run (quick check)

```bash
cd examples/presentation-demo-app
pip install -r requirements.txt
python app.py
```

Open: `http://localhost:5000/healthz`

## Docker build and run

```bash
cd examples/presentation-demo-app

docker build -t yourdockerhubusername/intelliscale-presentation-demo:latest .
docker run -p 5000:5000 --name intelliscale-demo-app yourdockerhubusername/intelliscale-presentation-demo:latest
```

## Push to Docker Hub (for IntelliScaleSim deployment)

```bash
docker login
docker push yourdockerhubusername/intelliscale-presentation-demo:latest
```

In IntelliScaleSim, deploy this image:

- `yourdockerhubusername/intelliscale-presentation-demo:latest`
- Container port: `5000`

## Recommended final-presentation scenario

1. Deploy this app in IntelliScaleSim.
2. Create autoscaling policy:
   - CPU up: `55%`
   - CPU down: `20%`
   - Memory up: `70%`
   - Memory down: `30%`
   - Min replicas: `1`
   - Max replicas: `5`
3. In Load Testing page, hit one of these paths:
   - CPU-heavy: `/api/work/cpu?complexity=7000`
   - Memory-heavy: `/api/work/memory?size_mb=80&hold_ms=1500`
   - Mixed realistic: `/api/checkout`
4. Start with:
   - RPS: `80-150`
   - Duration: `120s`
   - Concurrency: `25-60`
5. Open Monitoring dashboard and show:
   - CPU/memory increase
   - scale-up events
   - throughput and latency changes
   - scale-down after test stops

## Example checkout payload

```json
{
  "user_id": "demo-user",
  "fraud_check_rounds": 20000,
  "items": [
    { "sku": "SKU-1001", "qty": 2, "price": 15.5 },
    { "sku": "SKU-1030", "qty": 1, "price": 42.0 }
  ]
}
```
