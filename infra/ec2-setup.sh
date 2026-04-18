#!/bin/bash
# ============================================
# RunReady SG — EC2 Setup Commands
# Run these after SSH-ing into the EC2 instance
# ============================================

# --- Step 1: System updates ---
sudo apt update && sudo apt upgrade -y

# --- Step 2: Install Docker ---
sudo apt install -y docker.io docker-compose-v2
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker $USER
# NOTE: Log out and back in after this for docker group to take effect
#       Run: exit
#       Then SSH back in

# --- Step 3: Install Nginx ---
sudo apt install -y nginx

# --- Step 4: Clone repo ---
cd ~
git clone https://github.com/fajaribnu/run-ready-sg.git
cd run-ready-sg

# --- Step 5: Create backend .env ---
# IMPORTANT: Get the NEW RDS host from Mustafa/Shihao first!
cat > backend/.env << 'EOF'
DB_HOST=<NEW_RDS_HOST_HERE>
DB_PORT=5432
DB_NAME=runready
DB_USER=runready_user
DB_PASSWORD=RunReady2026Sg
DATABASE_URL=postgresql://runready_user:RunReady2026Sg@<NEW_RDS_HOST_HERE>:5432/runready

DATA_GOV_API_KEY=<YOUR_API_KEY_HERE>

AWS_REGION=ap-southeast-1
SES_SENDER_EMAIL=alerts@runready.sg

CORS_ORIGINS=http://localhost:5173,https://dfiucv08q17cd.cloudfront.net

BACKEND_PORT=8000
EOF
echo ">>> Edit backend/.env with real values: nano backend/.env"

# --- Step 6: Build and start backend (production compose — no local DB) ---
cd infra
docker compose -f docker-compose.prod.yml up -d --build
cd ..

# --- Step 7: Verify backend is running ---
echo ">>> Waiting 10s for container to start..."
sleep 10
curl -s http://localhost:8000/health
# Should return: {"status":"ok","service":"runready-sg"}

# --- Step 8: Configure Nginx ---
sudo cp infra/nginx.conf /etc/nginx/sites-available/runready
sudo ln -sf /etc/nginx/sites-available/runready /etc/nginx/sites-enabled/runready
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# --- Step 9: Smoke test through Nginx ---
curl -s http://localhost/api/check-run?lat=1.35\&lng=103.82
# Should return JSON with status: "SAFE" or "WARNING"

# --- Step 10: Set up cron ingestion ---
sudo mkdir -p /var/log/runready
sudo chown ubuntu:ubuntu /var/log/runready

# Install crontab (weather ingestion every 15 min)
# NOTE: cron runs on the host, but backend is in Docker.
# Option A: Use curl to hit the endpoint instead
(crontab -l 2>/dev/null; echo "*/15 * * * * curl -s http://localhost:8000/api/ingest >> /var/log/runready/ingestion.log 2>&1") | crontab -
# Option B: If ingestion is a standalone script, run via docker exec
# */15 * * * * docker exec runready-backend python -m ingestion.ingest_weather >> /var/log/runready/ingestion.log 2>&1

echo ""
echo "============================================"
echo "  DONE! Backend should be live."
echo "  Test from your laptop:"
echo "  curl http://<EC2_PUBLIC_IP>/api/check-run?lat=1.35&lng=103.82"
echo "============================================"
