# Test Application for IntelliScaleSim

This is a simple test application to demonstrate deploying custom local Docker images through IntelliScaleSim.

## What it does

A simple static web page served by nginx showing that the deployment was successful.

## How to Build and Deploy

### Step 1: Build the Docker Image

Open a terminal in this directory and run:

```bash
cd C:\Users\patil\OneDrive\Desktop\IntelliScaleSim-10\test-app
docker build -t intelliscale-test:v1 .
```

This will:
- Build a Docker image based on nginx:alpine
- Copy the HTML file into the image
- Tag it as `intelliscale-test:v1`

### Step 2: Verify the Image

Check that the image was created:

```bash
docker images | findstr intelliscale-test
```

You should see:
```
intelliscale-test   v1    <image-id>   <time>   <size>
```

### Step 3: Deploy via IntelliScaleSim

1. Go to http://localhost:5173 (IntelliScaleSim frontend)
2. Navigate to **Deployments**
3. Click **"+ Deploy New Container"**
4. In the **Container Image** field, type: `intelliscale-test:v1`
5. You should see it appear in the autocomplete dropdown as a local image
6. Fill in other details:
   - **Container Name**: my-test-app
   - **Port**: 8080 (or any available port)
7. Click **Deploy Container**

### Step 4: Access Your Deployed App

Once deployed, open your browser to:
```
http://localhost:8080
```

You should see a beautiful purple gradient page with a success message! 🎉

## What This Demonstrates

✅ Building custom Docker images locally  
✅ IntelliScaleSim detecting local images  
✅ Deploying from local Docker Desktop  
✅ No pull from Docker Hub needed  
✅ Instant deployment

## Troubleshooting

**Image not showing in autocomplete?**
- Make sure Docker Desktop is running
- Refresh the deployment modal (close and reopen)

**Deployment fails?**
- Check that the port isn't already in use
- Verify Docker Desktop is running
- Check backend logs for errors
