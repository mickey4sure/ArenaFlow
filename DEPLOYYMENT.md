# ArenaFlow Deployment Guide (Cloud Run + GitHub Trigger CI/CD)

This document explains how to deploy ArenaFlow using Docker, Google Cloud Build, and Cloud Run. It also includes GitHub-triggered auto-deployment, rollback commands, and log monitoring.

---

## Prerequisites

Before deployment, ensure the following are installed:

* Google Cloud SDK (`gcloud` CLI)
* Docker
* Git
* A Google Cloud project with billing enabled

Login to Google Cloud:

```
gcloud auth login
```

Set your active project:

```
gcloud config set project YOUR_PROJECT_ID
```

Enable required services:

```
gcloud services enable run.googleapis.com
cloudbuild.googleapis.com
artifactregistry.googleapis.com
```

---

## Step 1: Build Docker Image Locally (Optional Test Step)

Build the container:

```
docker build -t arenaflow .
```

Run locally:

```
docker run -p 8080:8080 arenaflow
```

Visit:

```
http://localhost:8080
```

---

## Step 2: Deploy Using Cloud Run (Manual Deployment)

Deploy directly from source:

```
gcloud run deploy arenaflow \
--source . \
--region asia-south1 \
--allow-unauthenticated
```

After deployment finishes, Cloud Run prints your public service URL.

---

## Step 3: Setup Artifact Registry (Recommended)

Create repository:

```
gcloud artifacts repositories create arenaflow-repo \
--repository-format=docker \
--location=asia-south1
```

Configure Docker authentication:

```
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

Tag image:

```
docker tag arenaflow \
asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/arenaflow-repo/arenaflow
```

Push image:

```
docker push \
asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/arenaflow-repo/arenaflow
```

Deploy image:

```
gcloud run deploy arenaflow \
--image asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/arenaflow-repo/arenaflow \
--region asia-south1 \
--allow-unauthenticated
```

---

## Step 4: GitHub Auto-Deployment Trigger Setup (CI/CD)

1. Open Cloud Build → Triggers
2. Click **Create Trigger**
3. Connect GitHub repository
4. Select repository containing ArenaFlow

Trigger configuration:

Branch:

```
main
```

Build configuration:

```
Dockerfile
```

Deploy command example:

```
gcloud run deploy arenaflow \
--source . \
--region asia-south1 \
--allow-unauthenticated
```

Now every push to `main` automatically redeploys ArenaFlow.

---

## Step 5: Environment Variables (If Required)

Example:

```
gcloud run services update arenaflow \
--update-env-vars GEMINI_API_KEY=YOUR_KEY
```

Add additional variables as needed.

---

## Step 6: Rollback to Previous Revision

List revisions:

```
gcloud run revisions list --service arenaflow --region asia-south1
```

Rollback command:

```
gcloud run services update-traffic arenaflow \
--to-revisions REVISION_NAME=100 \
--region asia-south1
```

Example:

```
gcloud run services update-traffic arenaflow \
--to-revisions arenaflow-00012-abc=100 \
--region asia-south1
```

This restores the previous working deployment instantly.

---

## Step 7: View Logs (Live Monitoring)

Tail logs in real-time:

```
gcloud logs tail \
"resource.type=cloud_run_revision AND resource.labels.service_name=arenaflow"
```

View last 50 logs:

```
gcloud logs read \
"resource.type=cloud_run_revision AND resource.labels.service_name=arenaflow" \
--limit 50
```

Open logs in browser:

```
https://console.cloud.google.com/run
```

Select service → Logs tab

---

## Step 8: Scale Configuration (Recommended Defaults)

Set minimum instances:

```
gcloud run services update arenaflow \
--min-instances=0
```

Set maximum instances:

```
gcloud run services update arenaflow \
--max-instances=10
```

Adjust based on traffic needs.

---

## Step 9: Verify Deployment

Check service status:

```
gcloud run services describe arenaflow \
--region asia-south1
```

Test endpoint:

```
curl YOUR_SERVICE_URL
```

Deployment complete.

---

## Troubleshooting

Common fixes:

Restart deployment:

```
gcloud run deploy arenaflow --source .
```

Check authentication:

```
gcloud auth list
```

Reset configuration:

```
gcloud config list
```

---

ArenaFlow is now configured with production-ready deployment workflow using Cloud Run and Cloud Build CI/CD.
