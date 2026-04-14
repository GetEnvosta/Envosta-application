#!/bin/bash
# Deploy Envosta Twilio Relay to Google Cloud Run
#
# Prerequisites:
#   1. gcloud CLI installed and authenticated
#   2. A GCP project (e.g. "envosta-prod")
#   3. Cloud Run API enabled: gcloud services enable run.googleapis.com
#   4. Artifact Registry API enabled: gcloud services enable artifactregistry.googleapis.com
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh

set -e

PROJECT_ID="${GCP_PROJECT_ID:-envosta-prod}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="twilio-relay"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "==> Building container image..."
gcloud builds submit --tag "${IMAGE}" --project "${PROJECT_ID}"

echo "==> Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 600 \
  --min-instances 0 \
  --max-instances 10 \
  --memory 256Mi \
  --cpu 1 \
  --session-affinity \
  --set-env-vars "SUPABASE_URL=${SUPABASE_URL},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}"

echo ""
echo "==> Deploy complete!"
echo "    Service URL:"
gcloud run services describe "${SERVICE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format "value(status.url)"

echo ""
echo "    WebSocket endpoint: <SERVICE_URL>/ws"
echo ""
echo "    Next steps:"
echo "    1. Copy the service URL above"
echo "    2. Set TWILIO_RELAY_URL env var in Supabase:"
echo "       supabase secrets set TWILIO_RELAY_URL=wss://<service-url>/ws"
echo "    3. The twilio-voice Edge Function will automatically use it"
