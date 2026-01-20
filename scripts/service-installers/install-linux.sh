#!/bin/bash
#
# Linux Service Installer for Node.js Applications
# Installs a Node.js app as a systemd service
#
# Usage: sudo ./install-linux.sh -n ServiceName -p /path/to/app [-e index.js] [-u username]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
ENTRY_POINT="index.js"
SERVICE_USER="$USER"
ENV_FILE=".env"

# Parse arguments
while getopts "n:p:e:u:h" opt; do
    case $opt in
        n) SERVICE_NAME="$OPTARG" ;;
        p) APP_PATH="$OPTARG" ;;
        e) ENTRY_POINT="$OPTARG" ;;
        u) SERVICE_USER="$OPTARG" ;;
        h)
            echo "Usage: $0 -n ServiceName -p /path/to/app [-e index.js] [-u username]"
            echo ""
            echo "Options:"
            echo "  -n    Service name (required)"
            echo "  -p    Application path (required)"
            echo "  -e    Entry point file (default: index.js)"
            echo "  -u    User to run service as (default: current user)"
            echo "  -h    Show this help message"
            exit 0
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$SERVICE_NAME" ] || [ -z "$APP_PATH" ]; then
    echo -e "${RED}Error: Service name (-n) and app path (-p) are required${NC}"
    echo "Usage: $0 -n ServiceName -p /path/to/app"
    exit 1
fi

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (sudo)${NC}"
    exit 1
fi

echo -e "${CYAN}================================${NC}"
echo -e "${CYAN}Linux Service Installer${NC}"
echo -e "${CYAN}================================${NC}"
echo ""

# Validate paths
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}Error: Application path does not exist: $APP_PATH${NC}"
    exit 1
fi

ENTRY_FILE="$APP_PATH/$ENTRY_POINT"
if [ ! -f "$ENTRY_FILE" ]; then
    echo -e "${RED}Error: Entry point file does not exist: $ENTRY_FILE${NC}"
    exit 1
fi

# Find Node.js
NODE_PATH=$(which node 2>/dev/null || echo "")
if [ -z "$NODE_PATH" ]; then
    echo -e "${RED}Error: Node.js not found. Please install Node.js${NC}"
    exit 1
fi

echo -e "${GREEN}Service Name: $SERVICE_NAME${NC}"
echo -e "${GREEN}App Path: $APP_PATH${NC}"
echo -e "${GREEN}Entry Point: $ENTRY_POINT${NC}"
echo -e "${GREEN}Node Path: $NODE_PATH${NC}"
echo -e "${GREEN}Service User: $SERVICE_USER${NC}"
echo ""

# Create logs directory
LOGS_DIR="$APP_PATH/logs"
mkdir -p "$LOGS_DIR"
chown "$SERVICE_USER:$SERVICE_USER" "$LOGS_DIR"

# Load environment variables for the service file
ENV_VARS=""
ENV_FILE_PATH="$APP_PATH/$ENV_FILE"
if [ -f "$ENV_FILE_PATH" ]; then
    echo -e "${CYAN}Loading environment variables from $ENV_FILE...${NC}"
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]] && [[ "$line" =~ = ]]; then
            ENV_VARS="${ENV_VARS}Environment=\"$line\"\n"
        fi
    done < "$ENV_FILE_PATH"
fi

# Create systemd service file
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo -e "${CYAN}Creating systemd service file...${NC}"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=MeJohnC.Org $SERVICE_NAME Service
Documentation=https://github.com/MeJohnC/MeJohnC.Org
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_PATH
ExecStart=$NODE_PATH $ENTRY_FILE
Restart=on-failure
RestartSec=10
StandardOutput=append:$LOGS_DIR/service.log
StandardError=append:$LOGS_DIR/error.log

# Environment
Environment=NODE_ENV=production
$(echo -e "$ENV_VARS")

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$APP_PATH/logs $APP_PATH/data
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}Service file created: $SERVICE_FILE${NC}"

# Reload systemd
echo -e "${CYAN}Reloading systemd daemon...${NC}"
systemctl daemon-reload

# Enable service
echo -e "${CYAN}Enabling service to start on boot...${NC}"
systemctl enable "$SERVICE_NAME"

echo ""
echo -e "${GREEN}Service installed successfully!${NC}"
echo ""
echo -e "${CYAN}Commands:${NC}"
echo -e "  Start:   sudo systemctl start $SERVICE_NAME"
echo -e "  Stop:    sudo systemctl stop $SERVICE_NAME"
echo -e "  Restart: sudo systemctl restart $SERVICE_NAME"
echo -e "  Status:  sudo systemctl status $SERVICE_NAME"
echo -e "  Logs:    sudo journalctl -u $SERVICE_NAME -f"
echo -e "  Remove:  sudo systemctl disable $SERVICE_NAME && sudo rm $SERVICE_FILE"
echo ""

# Ask to start service
read -p "Start service now? (Y/n) " START_NOW
if [ "$START_NOW" != "n" ] && [ "$START_NOW" != "N" ]; then
    echo -e "${CYAN}Starting service...${NC}"
    systemctl start "$SERVICE_NAME"
    sleep 2
    systemctl status "$SERVICE_NAME" --no-pager
fi

echo ""
echo -e "${CYAN}================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${CYAN}================================${NC}"
