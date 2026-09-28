#!/bin/bash

# ShopStream System Launcher
# Compatible with Unix/Linux/MacOS

echo "========================================"
echo "  ShopStream System Launcher"
echo "========================================"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if Docker container is running
check_docker_container() {
    if [ "$(docker ps -q -f name=shopstream-postgres)" ]; then
        return 0
    else
        return 1
    fi
}

# Start PostgreSQL database
start_postgresql() {
    echo "Checking PostgreSQL database..."
    
    if ! command_exists docker; then
        echo "⚠ Docker not found. Please ensure PostgreSQL is running manually on localhost:5432"
        echo "  Database URL should be: postgresql://postgres:yourpassword@localhost:5432/shopstream"
        return
    fi
    
    if check_docker_container; then
        echo "✓ PostgreSQL container is already running"
        return
    fi
    
    echo "Starting PostgreSQL Docker container..."
    docker run --name shopstream-postgres -e POSTGRES_DB=shopstream -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres:13
    
    if [ $? -eq 0 ]; then
        echo "✓ PostgreSQL container started"
        echo "Waiting for PostgreSQL to initialize..."
        sleep 10
    else
        echo "✗ Failed to start PostgreSQL container"
    fi
}

# Install dependencies if needed
install_dependencies() {
    local dir=$1
    local name=$(basename "$dir")
    
    if [ ! -d "$dir/node_modules" ]; then
        echo "Installing dependencies in $name..."
        (cd "$dir" && npm install)
        if [ $? -eq 0 ]; then
            echo "✓ Dependencies installed in $name"
        else
            echo "✗ Failed to install dependencies in $name"
        fi
    else
        echo "✓ Dependencies already installed in $name"
    fi
}

# Run database migrations
run_migrations() {
    echo "Running database migrations..."
    (cd backend && npx prisma migrate deploy)
    if [ $? -eq 0 ]; then
        echo "✓ Database migrations completed"
    else
        echo "✗ Failed to run database migrations"
    fi
}

# Check prerequisites
if ! command_exists node || ! command_exists npm; then
    echo "✗ Node.js and npm are required. Please install them first."
    exit 1
fi

# Start PostgreSQL
start_postgresql

# Install dependencies
install_dependencies "backend"
install_dependencies "frontend"

# Run migrations
run_migrations

# Start backend server in background
echo "Starting backend server..."
(cd backend && npm run dev) &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server in background
echo "Starting frontend server..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Show success message
echo ""
echo "========================================"
echo "  ShopStream Systems Started"
echo "========================================"
echo "Backend API:    http://localhost:4000"
echo "Frontend App:   http://localhost:5173"
echo "Swagger Docs:   http://localhost:4000/api/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes and handle shutdown
trap "echo; echo 'Shutting down services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Wait for processes to complete
wait $BACKEND_PID $FRONTEND_PID