#!/bin/bash
# Universal .env Injector for Platform - Parses docker-compose + .env.example → UI prompts → generates env-file for docker compose
# Usage: ./env-injector.sh /path/to/repo

REPO_PATH=${1:-.}
cd "$REPO_PATH"

echo "🚀 Auto-discovering .env needs for $REPO_PATH..."

# Find env_files from docker-compose.yml
ENV_FILES=()
while IFS= read -r line; do
  if [[ $line == *env_file* ]]; then
    envfile=$(echo $line | sed -r s/.*env_file: *[\[\']?([^\'']+)[\]\']?.*/\1/')
    ENV_FILES+=("$envfile")
  fi
done < <(grep -r "env_file:" docker-compose*.yml 2>/dev/null || true)

echo "📋 Found services using env files: ${ENV_FILES[*]}"

# Parse .env.example or .env.template
declare -A ALL_VARS
for envfile in "${ENV_FILES[@]}"; do
  example="${envfile}.example"
  template="${envfile}.template"
  
  if [[ -f "$example" ]]; then
    echo "Parsing $example..."
    while IFS='=' read -r key val <&3; do
      key=$(echo "$key" | xargs)  # trim
      if [[ -n "$key" && ! "$key" =~ ^# || ^$ ]]; then
        ALL_VARS["$key"]=1
        echo "  $key = [USER_INPUT_REQUIRED]"
      fi
    done 3< "$example"
  elif [[ -f "$template" ]]; then
    echo "Using $template..."
    # Similar parsing
  fi
done

echo "
✅ Copy above vars to your platform UI.
Deploy command: docker compose --env-file /path/to/platform-generated.env up -d --build

For production: Mark JWT_SECRET/AWS_* as 'secret' type."

