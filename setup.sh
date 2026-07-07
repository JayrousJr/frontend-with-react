#!/usr/bin/env bash
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}"
echo "  ┌─────────────────────────────────────┐"
echo "  │     React Frontend Template Setup    │"
echo "  └─────────────────────────────────────┘"
echo -e "${NC}"

# --- Project name ---
read -rp "Project name (kebab-case, e.g. my-saas-web): " PROJECT_NAME
if [[ -z "$PROJECT_NAME" ]]; then
  echo "Project name is required." && exit 1
fi

# --- Display name ---
read -rp "App display name (shown in browser tab, e.g. My SaaS): " APP_NAME
APP_NAME="${APP_NAME:-$PROJECT_NAME}"

# --- Backend URL ---
read -rp "Backend API URL [http://localhost:3000]: " BACKEND_URL
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"

echo ""
echo -e "${BOLD}Setting up ${GREEN}${PROJECT_NAME}${NC}${BOLD}...${NC}"
echo ""

# 1. Remove template git history
rm -rf .git
echo "  Removed template .git history"

# 2. Initialize fresh repo
git init -q
echo "  Initialized new git repository"

# 3. Update package.json
sed -i "s/\"name\": \"frontend-react-template\"/\"name\": \"${PROJECT_NAME}\"/" package.json
echo "  Updated package.json (name: ${PROJECT_NAME})"

# 4. Update index.html titles
sed -i "s/React Frontend Template/${APP_NAME}/g" index.html
echo "  Updated index.html title"

# 5. Create .env from example
if [[ ! -f .env ]]; then
  cp .env.example .env
fi
sed -i "s|VITE_API_URL=.*|VITE_API_URL=\"${BACKEND_URL}/api\"|" .env
sed -i "s|VITE_GRAPHQL_URL=.*|VITE_GRAPHQL_URL=\"${BACKEND_URL}/api/graphql\"|" .env
sed -i "s|VITE_APP_NAME=.*|VITE_APP_NAME=\"${APP_NAME}\"|" .env
echo "  Configured .env (API: ${BACKEND_URL}/api)"

# 6. Install dependencies
echo ""
echo "  Installing dependencies..."
pnpm install --silent 2>/dev/null || npm install --silent 2>/dev/null
echo "  Dependencies installed"

# 7. Initial commit
git add -A
git commit -q -m "Initial commit from frontend-react-template"
echo "  Created initial commit"

# 8. Remove this setup script
rm -f setup.sh
git add -A
git commit -q -m "Remove setup script"

echo ""
echo -e "${BOLD}${GREEN}Done!${NC} Next steps:"
echo ""
echo "  1. Make sure the backend is running at ${BACKEND_URL}"
echo "  2. Start the dev server:  pnpm dev"
echo ""
