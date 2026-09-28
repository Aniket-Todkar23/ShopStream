@echo off
TITLE ShopStream - Full System Launcher

echo ========================================
echo   ShopStream System Launcher
echo ========================================

:: Check if Docker is available for PostgreSQL
docker --version >nul 2>&1
if %errorlevel% == 0 (
    echo Checking for PostgreSQL Docker container...
    docker ps | findstr "shopstream-postgres" >nul
    if %errorlevel% == 0 (
        echo PostgreSQL container is already running.
    ) else (
        echo Starting PostgreSQL Docker container...
        docker run --name shopstream-postgres -e POSTGRES_DB=shopstream -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres:13
        echo Waiting for PostgreSQL to initialize...
        timeout /t 10 /nobreak >nul
    )
) else (
    echo Docker not found. Please ensure PostgreSQL is running on localhost:5432
    echo Database URL should be: postgresql://postgres:yourpassword@localhost:5432/shopstream
    echo.
)

:: Navigate to backend directory
cd /d "%~dp0backend"

:: Install backend dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
)

:: Run database migrations
echo Running database migrations...
npx prisma migrate deploy

:: Start backend server in background
echo Starting backend server...
start "Backend Server" cmd /k "cd /d "%cd%" && npm run dev"

:: Wait a moment for backend to start
timeout /t 5 /nobreak >nul

:: Navigate to frontend directory
cd /d "%~dp0frontend"

:: Install frontend dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

:: Start frontend server
echo Starting frontend server...
start "Frontend Server" cmd /k "cd /d "%cd%" && npm run dev"

echo.
echo ========================================
echo   ShopStream Systems Started
echo ========================================
echo Backend API:    http://localhost:4000
echo Frontend App:   http://localhost:5173
echo Swagger Docs:   http://localhost:4000/api/docs
echo.
echo Press any key to exit this launcher (servers will continue running)
pause >nul

:: Option to stop containers when done
echo.
echo Would you like to stop the PostgreSQL container? (y/n)
set /p choice=
if /i "%choice%"=="y" (
    docker stop shopstream-postgres
    docker rm shopstream-postgres
    echo PostgreSQL container stopped and removed.
)

exit