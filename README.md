<div align="center">
  <h1>🚀 IntelliScaleSim</h1>
  <p><strong>Intelligent Scaling Simulator & Cloud Orchestration Platform</strong></p>
  <p><em>A production-ready platform for container orchestration, AI-powered cost estimation, and real-time auto-scaling. Deploy applications, simulate traffic loads, and watch the system intelligently manage instances with integrated Prometheus & Grafana dashboards.</em></p>
  
  <p>
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white" alt="Prometheus" />
    <img src="https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white" alt="Grafana" />
    <img src="https://img.shields.io/badge/Groq_AI-00A67E?style=for-the-badge" alt="Groq AI" />
  </p>
  
  <p>
    <a href="#-quick-start-docker-compose">Quick Start</a> •
    <a href="#-architecture-diagram">Architecture</a> •
    <a href="#-auto-scaling-engine">Auto-Scaling</a> •
    <a href="#-load-testing">Load Testing</a> •
    <a href="#-monitoring--observability">Monitoring</a>
  </p>
</div>

---

## 📖 About The Project

**IntelliScaleSim** bridges the gap between theoretical cloud concepts and practical container orchestration. Built as a comprehensive orchestration engine, it allows users to spawn Docker containers on the fly, define custom autoscaling policies, fire load tests at those containers, and watch the system intelligently manage instances—all with AI-powered cost estimation and real-time monitoring.

### 🌟 Key Highlights

- **🐳 Docker Hub Integration**: Browse and deploy real images from Docker Hub
- **🤖 AI-Powered Cost Estimation**: Groq AI provides intelligent cost analysis and recommendations
- **📊 Embedded Grafana Dashboards**: Real-time monitoring integrated directly into the UI
- **⚡ Production-Grade Auto-Scaling**: Real-time container scaling based on CPU/Memory thresholds
- **🔬 Live Load Testing**: Generate actual HTTP traffic to test auto-scaling behavior
- **📈 Real-Time Events Feed**: Watch scaling events happen live in the dashboard
- **🔐 Complete Authentication**: JWT-based auth with role-based access control (Student/Teacher/Admin)
- **👤 Full Profile Management**: Editable user profiles with preferences
- **📈 Production Ready**: Runs entirely with `docker-compose up`

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              IntelliScaleSim                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Frontend (React + Vite)                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │Dashboard │ │Containers│ │AutoScale │ │Load Test │ │Monitoring│     │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │  │
│  │  │AI Cost   │ │Billing   │ │Profile   │ │DockerHub │                  │  │
│  │  │Estimator │ │Simulator │ │Settings  │ │Browser   │                  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Backend (FastAPI + Python 3.11)                   │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │  │
│  │  │ Auth Service   │  │ Container Svc  │  │ AutoScale Svc  │          │  │
│  │  │ (JWT + RBAC)   │  │ (Docker API)   │  │ (Background)   │          │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘          │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │  │
│  │  │ Load Test Svc  │  │ AI/Groq Svc    │  │ Profile Svc    │          │  │
│  │  │ (aiohttp)      │  │ (LLM Analysis) │  │ (User Mgmt)    │          │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘          │  │
│  │                           │                                           │  │
│  │                           ▼                                           │  │
│  │  ┌────────────────────────────────────────────────────────────┐      │  │
│  │  │              SQLAlchemy ORM + Database                      │      │  │
│  │  │   PostgreSQL (Production) / SQLite (Development)           │      │  │
│  │  └────────────────────────────────────────────────────────────┘      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Docker Engine (Host)                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │  │
│  │  │Container1│ │Container2│ │Container3│ │ContainerN│  ← Managed      │  │
│  │  │(nginx)   │ │(python)  │ │(node)    │ │(custom)  │    Containers   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       Monitoring Stack                                │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐      │  │
│  │  │Prometheus  │  │  Grafana   │  │  cAdvisor  │  │Node Exporter│      │  │
│  │  │  :9090     │  │   :3500    │  │   :8080    │  │   :9100     │      │  │
│  │  │ (Metrics)  │  │(Dashboard) │  │(Container) │  │  (Host)     │      │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction** → Frontend sends requests to FastAPI backend
2. **Container Deployment** → Backend communicates with Docker Engine via Docker SDK
3. **Auto-Scaling** → Background task monitors containers every 10 seconds
4. **Metrics Collection** → Prometheus scrapes cAdvisor, Node Exporter, and Backend `/metrics`
5. **Visualization** → Grafana displays real-time dashboards (embedded in frontend)

---

## ✨ Core Modules & Features

### 1. 🐳 Dynamic Container Orchestration
- **Docker Hub Browser**: Search and deploy official/community images directly from Docker Hub
- **Live Deployment**: Deploy web apps, APIs, or custom Docker images from the dashboard
- **Resource Management**: Assign CPU and Memory limits for each container
- **Container Metrics**: Real-time CPU, memory, and network I/O monitoring

### 2. 🤖 AI-Powered Cost Estimation (Groq Integration)
- **Intelligent Analysis**: Groq LLM provides detailed cost breakdowns and insights
- **Multi-Cloud Comparison**: Compare costs across AWS, GCP, and Azure
- **Resource Recommendations**: AI suggests optimal resource configurations
- **Container Analysis**: Analyze running containers for optimization opportunities

### 3. ⚡ Intelligent Auto-Scaling Engine
- **Custom Policies**: Create declarative rules based on CPU or Memory utilization
- **Real-Time Events Feed**: Watch scale-up/scale-down events live in the dashboard
- **Background Orchestrator**: Evaluates container health every 10 seconds
- **Scale-to-Zero Support**: Aggressive scale-down for unused resources
- **Configurable Thresholds**: Set CPU/Memory up/down thresholds per container
- **Cooldown Periods**: Prevent thrashing with configurable cooldowns
- **Min/Max Replicas**: Define bounds for replica counts

### 4. 📈 Load Testing Studio
- **Real HTTP Traffic**: Actual aiohttp-based concurrent requests (not simulated)
- **Configurable Parameters**: Requests per second, duration, concurrent users
- **Real-Time Visualization**: Live charts for latency, success rates, and RPS
- **Auto-Scaling Trigger**: Generate enough load to trigger scaling events
- **Metrics Integration**: Load test metrics feed into Prometheus

### 5. 📊 Embedded Monitoring (Prometheus & Grafana)
- **Embedded Dashboards**: Grafana dashboards integrated directly into the frontend
- **Live Metrics Refresh**: Auto-refresh every 3-5 seconds
- **Scaling Events Timeline**: Real-time feed of auto-scaling activity
- **Prometheus Metrics**: CPU, memory, API latency, container counts
- **cAdvisor Integration**: Container-level resource metrics
- **Node Exporter**: Host system metrics
- **Mini Sparklines**: Historical trend visualization in metric cards

### 6. 💰 Scenario-Based Billing Simulator
- **Cloud Provider Costing**: Predict infrastructure costs on AWS, GCP, or Azure
- **Auto-Fill from Containers**: Import running container specs into cost calculator

### 7. 👤 User Profile Management
- **Editable Profile**: Update name, email, and avatar
- **Password Management**: Secure password change with validation
- **Usage Statistics**: View container count, load tests run, policies created
- **Preferences**: Theme selection, notification settings, auto-refresh interval
- **Session Management**: View active sessions and logout

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript + Vite | Fast, modern SPA with hot reload |
| **Styling** | TailwindCSS | Glassmorphism design system |
| **Backend** | FastAPI (Python 3.11) | Async, high-performance API |
| **Database** | PostgreSQL 16 | Persistent data storage |
| **Cache** | Redis 7 | Session management, caching |
| **AI** | Groq API (llama-3.1-8b-instant) | Cost estimation & recommendations |
| **Monitoring** | Prometheus + Grafana | Metrics collection & visualization |
| **Container Metrics** | cAdvisor | Docker container monitoring |
| **Host Metrics** | Node Exporter | System resource monitoring |

---

## 🚀 Quick Start (Docker Compose)

### Prerequisites
- **Docker Desktop** (running)
- **Groq API Key** (get free at [console.groq.com](https://console.groq.com/keys))

### One-Command Deployment

```bash
# Clone the repository
git clone https://github.com/yourusername/intelliscalesim.git
cd intelliscalesim

# Create environment file
cp backend/.env.example backend/.env
# Edit backend/.env and add your GROQ_API_KEY

# Start everything
docker-compose up -d
```

**That's it!** 🎉 Access the application at:

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8001 |
| **API Docs** | http://localhost:8001/docs |
| **Grafana** | http://localhost:3500 |
| **Prometheus** | http://localhost:9090 |

### Default Login Credentials
- **Email**: `demo@test.com`
- **Password**: `Password123!`

---

## 💻 Local Development Setup

### Backend Setup
```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\activate
# Unix/macOS
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
# Optional: use Docker PostgreSQL from host (avoids local Postgres 5432 conflicts)
# DATABASE_URL=postgresql://intelliscale:intelliscale_secret_2024@127.0.0.1:5433/intelliscale_db

# Start the server
uvicorn app.main:app --reload --port 8001
```

### Frontend Setup
```bash
cd frontend
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

### Monitoring Stack (Optional for local dev)
```bash
# Start Prometheus, Grafana, cAdvisor, Node Exporter
docker-compose -f docker-compose.monitoring.yml up -d
```

---

## ⚡ Auto-Scaling Engine

The auto-scaling engine is a core feature that provides **real, production-grade** container scaling based on resource utilization.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    Auto-Scaling Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Container  │────▶│   Metrics    │────▶│   Policy     │    │
│  │   Running    │     │   (CPU/Mem)  │     │   Evaluation │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                                                    │            │
│                                                    ▼            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Scaling    │◀────│   Decision   │◀────│   Threshold  │    │
│  │   Action     │     │   Engine     │     │   Check      │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐     ┌──────────────┐                         │
│  │   Event      │────▶│   Dashboard  │                         │
│  │   Logged     │     │   Update     │                         │
│  └──────────────┘     └──────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Scaling Policy Configuration

| Parameter | Description | Example |
|-----------|-------------|---------|
| `cpu_threshold_up` | Scale up when CPU exceeds this % | 70% |
| `cpu_threshold_down` | Scale down when CPU drops below this % | 20% |
| `memory_threshold_up` | Scale up when memory exceeds this % | 75% |
| `memory_threshold_down` | Scale down when memory drops below this % | 25% |
| `min_replicas` | Minimum number of replicas | 1 |
| `max_replicas` | Maximum number of replicas | 10 |
| `cooldown_seconds` | Wait time between scaling actions | 60 |

### Background Task

The auto-scaler runs as a background task every 10 seconds:

```python
# Pseudo-code of scaling logic
async def autoscaler_background_task():
    while True:
        for policy in active_policies:
            container = get_container(policy.container_id)
            metrics = get_container_metrics(container)
            
            if metrics.cpu > policy.cpu_threshold_up:
                if current_replicas < policy.max_replicas:
                    scale_up(container)
                    log_scaling_event('scale_up', 'cpu', metrics.cpu)
            
            elif metrics.cpu < policy.cpu_threshold_down:
                if current_replicas > policy.min_replicas:
                    scale_down(container)
                    log_scaling_event('scale_down', 'cpu', metrics.cpu)
        
        await asyncio.sleep(10)
```

### Viewing Scaling Events

Scaling events are displayed in real-time on the Monitoring dashboard:
- **Event Type**: Scale Up (green) or Scale Down (orange)
- **Trigger Metric**: CPU or Memory that triggered the event
- **Metric Value**: The actual value at the time of scaling
- **Replica Change**: Before → After replica counts
- **Timestamp**: When the event occurred

---

## 🔬 Load Testing

The load testing module generates **real HTTP traffic** to test your containers and trigger auto-scaling.

### Features

- **Concurrent Requests**: Send multiple parallel HTTP requests
- **Configurable Duration**: Run tests for specified time periods
- **Real-Time Metrics**: Watch latency, success rate, and RPS live
- **Integration with Auto-Scaling**: Generate enough load to trigger scaling events

### How to Run a Load Test

1. **Deploy a Container**: Deploy any web server (nginx, python-http, etc.)
2. **Navigate to Load Testing**: Go to the Load Testing page
3. **Configure Test**:
   - Select target container
   - Set requests per second (10-1000)
   - Set duration (10-300 seconds)
   - Set concurrent users (1-100)
4. **Start Test**: Click "Start Load Test"
5. **Watch Results**: View real-time charts showing latency and success rates

### Triggering Auto-Scaling with Load Tests

To see auto-scaling in action:

1. Create an auto-scaling policy with low thresholds:
   - CPU threshold up: 50%
   - CPU threshold down: 10%
   - Max replicas: 5

2. Run a load test:
   - High RPS (100+)
   - Duration: 120 seconds

3. Watch the Monitoring dashboard:
   - CPU will spike
   - Scaling events will appear
   - Replica count will increase

4. Stop the load test:
   - CPU will drop
   - Scale-down events will occur
   - Replicas will decrease

---

## 🔧 Environment Configuration

### Backend (.env)
```env
# Database (use SQLite for development, PostgreSQL for production)
DATABASE_URL=sqlite:///./app.db

# Security
SECRET_KEY=your-super-secret-key

# Groq AI (Required for AI features)
GROQ_API_KEY=your-groq-api-key

# Redis (optional)
REDIS_URL=redis://localhost:6379/0
```

### Frontend (.env.local)
```env
VITE_API_URL=http://127.0.0.1:8001
VITE_GRAFANA_URL=http://localhost:3500
```

---

## 📊 Monitoring & Observability

### Embedded Grafana Dashboards

The frontend includes embedded Grafana dashboards showing:
- **System Metrics**: CPU, Memory, Network I/O
- **API Performance**: Request latency, error rates, RPS
- **Container Metrics**: Per-container resource usage
- **Custom Panels**: Configurable time ranges and auto-refresh

### Prometheus Metrics

The backend exposes Prometheus metrics at `/metrics`:
```
# HELP request_count Total HTTP requests
# HELP request_latency_seconds Request latency histogram
# HELP active_requests Currently active requests
# HELP container_count Total managed containers
```

---

## 🐳 Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `intelliscale-frontend` | Custom (nginx) | 5173 | React SPA |
| `intelliscale-backend` | Custom (Python) | 8001 | FastAPI server |
| `intelliscale-postgres` | `postgres:16-alpine` | 5432 | Database |
| `intelliscale-redis` | `redis:7-alpine` | 6379 | Cache |
| `intelliscale-prometheus` | `prom/prometheus:latest` | 9090 | Metrics |
| `intelliscale-grafana` | `grafana/grafana:latest` | 3500 | Dashboards |
| `intelliscale-node-exporter` | `prom/node-exporter:latest` | 9100 | Host metrics |
| `intelliscale-cadvisor` | `gcr.io/cadvisor/cadvisor:latest` | 8080 | Container metrics |

---

## 📁 Project Structure

```
intelliscalesim/
├── backend/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic (Groq, DockerHub)
│   │   └── main.py        # FastAPI application
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # API utilities
│   ├── Dockerfile
│   └── nginx.conf
├── grafana/
│   ├── dashboards/        # Dashboard JSON files
│   └── provisioning/      # Auto-provisioning configs
├── docker-compose.yml     # Full production stack
└── prometheus.yml         # Prometheus configuration
```

---

## 🔐 API Authentication

All API endpoints (except auth) require JWT authentication:

```bash
# Login
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@test.com", "password": "Password123!"}'

# Use token for authenticated requests
curl http://localhost:8001/containers \
  -H "Authorization: Bearer <your-token>"
```

---

## 🤖 AI Features (Groq Integration)

### Cost Estimation
```bash
POST /api/ai/cost-estimate
{
  "image": "nginx:latest",
  "cpu_cores": 2,
  "memory_gb": 4,
  "storage_gb": 50,
  "hours_per_month": 730,
  "provider": "aws"
}
```

### Resource Recommendations
```bash
POST /api/ai/recommendations
{
  "workload_type": "web_server",
  "expected_traffic": "medium",
  "current_cpu": 1,
  "current_memory": 2
}
```

### Container Analysis
```bash
GET /api/ai/analyze/{container_id}?hours=24
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

---

## 🏃 Complete Run Commands

### Option 1: Docker Compose (Recommended for Production)

```bash
# Clone repository
git clone https://github.com/yourusername/intelliscalesim.git
cd intelliscalesim

# Create and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your GROQ_API_KEY

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Option 2: Local Development (Separate Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your GROQ_API_KEY

uvicorn app.main:app --reload --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

**Terminal 3 - Monitoring (Optional):**
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### Option 3: Development with Hot Reload

```bash
# Start backend with auto-reload
cd backend && uvicorn app.main:app --reload --port 8001

# In another terminal, start frontend with hot reload
cd frontend && npm run dev

# In another terminal, start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d
```

### Verifying Everything Works

1. **Frontend**: http://localhost:5173 - Should show login page
2. **Backend API**: http://localhost:8001/docs - Should show Swagger docs
3. **Grafana**: http://localhost:3500 - Should show dashboards (admin/admin)
4. **Prometheus**: http://localhost:9090 - Should show Prometheus UI

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 8001 in use | Change port: `uvicorn app.main:app --port 8002` |
| Docker not running | Start Docker Desktop |
| GROQ_API_KEY missing | Add key to backend/.env |
| Containers not showing | Ensure Docker Desktop is running |
| Grafana not loading | Wait 30s after docker-compose up |

---

## 🔄 Workflow: Demonstrating Auto-Scaling

Here's a complete workflow to demonstrate the auto-scaling feature:

### Step 1: Deploy a Container
```bash
# Using the UI:
1. Login at http://localhost:5173
2. Go to Containers → Deploy Container
3. Select image: nginx:latest
4. Set CPU: 0.5, Memory: 256MB
5. Click Deploy
```

### Step 2: Create Scaling Policy
```bash
# Using the UI:
1. Go to Auto Scaling
2. Click "Create Policy"
3. Select your nginx container
4. Set thresholds:
   - CPU Up: 50%, Down: 10%
   - Memory Up: 70%, Down: 20%
   - Min replicas: 1, Max: 5
5. Click Create
```

### Step 3: Run Load Test
```bash
# Using the UI:
1. Go to Load Testing
2. Select target container
3. Set RPS: 100
4. Duration: 120 seconds
5. Click Start Test
```

### Step 4: Watch Auto-Scaling
```bash
# In the Monitoring page:
1. Watch CPU metrics spike
2. See scaling events appear in the timeline
3. Observe replica count increase
4. When test ends, watch scale-down events
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <p><strong>Built with ❤️ for cloud education and research</strong></p>
  <p>
    <a href="#-quick-start-docker-compose">Get Started</a> •
    <a href="#-auto-scaling-engine">Auto-Scaling</a> •
    <a href="#-load-testing">Load Testing</a> •
    <a href="#-monitoring--observability">Monitoring</a>
  </p>
</div>
