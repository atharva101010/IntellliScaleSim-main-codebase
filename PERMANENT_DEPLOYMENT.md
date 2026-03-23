# 🏛️ Permanent Global Deployment Plan

To have a 24/7 "Permanent" platform that students can use anytime without your laptop being on, you **must** use a Cloud VPS. 

Because your project *manages other containers*, it requires a "full computer" (Virtual Machine) where it has control over the Docker Engine.

---

## 🏆 Top Permanent Destinations

### 1. Oracle Cloud "Always Free" (The Best Free Option)
- **What it is**: A permanent server that never expires.
- **Why**: It gives you **24GB of RAM** and **4 CPU cores** for free. This is huge for a simulation project.
- **Deployment**: You install Docker on it, clone your Git repo, and run.

### 2. DigitalOcean Droplet ($4-6/month)
- **What it is**: The most popular choice for student projects.
- **Why**: Extremely simple to set up. You can use their "Docker one-click" image to have a server ready in 60 seconds.
- **Reliability**: 99.9% uptime.

### 3. AWS EC2 (Free Tier - 12 Months)
- **What it is**: Industry-standard cloud.
- **Why**: Looks great on a resume.
- **Note**: After 12 months, you will start being charged.

---

## 🛠️ The "Permanent" Architecture (Docker-Compose)

To deploy to any of these servers, we should use a single `docker-compose.yml` file that starts everything at once.

### Proposed Production Stack:
1.  **Nginx**: The "Front Door" (handles your URL and SSL).
2.  **Frontend**: Your React Dashboard (built into a static image).
3.  **Backend**: The FastAPI server.
4.  **Database**: A permanent PostgreSQL container.
5.  **Telemetry**: Prometheus & Grafana.
6.  **Docker Socket**: The Backend connects to the Server's `/var/run/docker.sock` to manage containers.

---

## 🛑 Why "PaaS" (Render, Vercel, Railway) is NOT Recommended
Platforms like Render or Vercel are great for simple websites, but for **IntelliScaleSim**, they are a bad fit because:
- They **don't allow** your code to talk to a Docker Engine.
- You cannot "spawn" new containers inside their environment.
- Your project's core feature (Autoscaling simulation) would break.

---

## 🏁 Recommendation for your Guide Review
If your guide asks for a permanent home, tell them: 
> *"We are deploying on a **Linux VPS (Virtual Private Server)** using **Docker Compose**. This ensures that the orchestration logic has direct access to a dedicated Docker daemon, providing true global state persistence for all students."*

**Would you like me to create the `docker-compose.production.yml` file for you right now?** This file will be the "Master Key" to deploying your project to any of the servers above.
