param(
    [string]$Message = "Auto-update and Zero-Downtime deploy for cashier-cash.com"
)

$ErrorActionPreference = "Stop"

Write-Host "[1/3] Adding changes to Git..." -ForegroundColor Cyan
git add -A

$status = git status --porcelain
if ($status) {
    git commit -m "$Message"
    Write-Host "[2/3] Pushing changes to GitHub..." -ForegroundColor Cyan
    git push origin main
} else {
    Write-Host "[Info] No local changes to commit, ensuring branch is pushed..." -ForegroundColor Yellow
    git push origin main
}

Write-Host "[3/3] Triggering Zero-Downtime Deployment on Server (cashier-vps)..." -ForegroundColor Cyan
ssh cashier-vps "bash /home/cashier-cash.com/deploy/zero_downtime_deploy.sh"

Write-Host "[Done] Deployment finished successfully without downtime!" -ForegroundColor Green
