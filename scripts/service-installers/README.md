# Service Installer Scripts

Scripts for deploying Node.js services (like the Site Manager Agent) as system services.

## Quick Start

Choose the deployment method that works best for your environment:

| Method | Best For | Complexity |
|--------|----------|------------|
| **PM2** | Development, quick setup | Low |
| **systemd** | Linux production servers | Medium |
| **Windows Service** | Windows servers | Medium |
| **Docker** | Containerized environments | Medium |

## PM2 (Recommended for Quick Setup)

PM2 is a production-ready process manager for Node.js.

```bash
# Install PM2 globally
npm install -g pm2

# Edit ecosystem.config.js with your paths
# Then start services
pm2 start ecosystem.config.js --env production

# Save process list and enable startup
pm2 save
pm2 startup
```

### PM2 Commands

```bash
pm2 list              # List all processes
pm2 logs              # View all logs
pm2 logs agent        # View specific service logs
pm2 monit             # Real-time monitoring
pm2 restart all       # Restart all services
pm2 reload all        # Zero-downtime reload
pm2 stop all          # Stop all services
pm2 delete all        # Remove all services
```

## Linux (systemd)

For production Linux servers using systemd.

```bash
# Make script executable
chmod +x install-linux.sh

# Install service (requires root)
sudo ./install-linux.sh -n site-manager-agent -p /path/to/app

# Options:
#   -n    Service name (required)
#   -p    Application path (required)
#   -e    Entry point file (default: index.js)
#   -u    User to run service as (default: current user)
```

### systemd Commands

```bash
sudo systemctl start site-manager-agent    # Start
sudo systemctl stop site-manager-agent     # Stop
sudo systemctl restart site-manager-agent  # Restart
sudo systemctl status site-manager-agent   # Status
sudo journalctl -u site-manager-agent -f   # View logs
```

## Windows (NSSM)

For Windows servers using NSSM (Non-Sucking Service Manager).

```powershell
# Run as Administrator
.\install-windows.ps1 -ServiceName "SiteManagerAgent" -AppPath "C:\apps\site-manager-agent"

# Options:
#   -ServiceName    Name of the Windows service
#   -AppPath        Path to the application
#   -EntryPoint     Entry file (default: index.js)
#   -UseNSSM        Use NSSM (default: true)
```

### NSSM Commands

```powershell
nssm start SiteManagerAgent     # Start
nssm stop SiteManagerAgent      # Stop
nssm restart SiteManagerAgent   # Restart
nssm status SiteManagerAgent    # Status
nssm edit SiteManagerAgent      # Edit configuration
nssm remove SiteManagerAgent    # Remove service
```

## Docker

For containerized deployments.

```bash
# Copy Dockerfile.template to your service directory
cp Dockerfile.template ../site-manager-agent/Dockerfile

# Edit docker-compose.yml with your paths

# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d agent

# View logs
docker-compose logs -f agent
```

### Docker Commands

```bash
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f            # View logs
docker-compose ps                 # List running containers
docker-compose restart agent      # Restart specific service
docker-compose pull               # Pull latest images
```

## Environment Variables

All methods support loading environment variables from a `.env` file in the application directory.

Example `.env`:
```env
NODE_ENV=production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
CLERK_SECRET_KEY=xxx
ANTHROPIC_API_KEY=xxx
```

## Logs

Logs are stored in the application's `logs/` directory:
- `service.log` or `out.log` - Standard output
- `error.log` - Error output
- `combined.log` - Combined logs (PM2)

## Health Checks

All services should implement a `/health` endpoint that returns:
- `200 OK` when healthy
- `503 Service Unavailable` when unhealthy

Example health check endpoint:
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});
```

## Troubleshooting

### Service won't start
1. Check logs for errors
2. Verify all environment variables are set
3. Ensure Node.js is installed and in PATH
4. Check file permissions

### Service crashes repeatedly
1. Check error logs
2. Verify database connectivity
3. Check memory limits
4. Review restart policies

### Permission denied
- Linux: Run installer with `sudo`
- Windows: Run PowerShell as Administrator
- Docker: Check volume permissions
