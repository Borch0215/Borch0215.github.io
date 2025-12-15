@echo off
chcp 65001 >nul
cls
echo.
echo 🚀 Iniciando servidores de Cableworld...
echo.

REM Verificar si ya hay procesos node corriendo
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ⚠️  Ya hay procesos Node corriendo. Deteniendo primero...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo ✓ Limpieza completada
echo.
echo Iniciando Backend (puerto 5000)...
start "Cableworld Backend" cmd /k "cd backend && node server.js"
timeout /t 3 /nobreak >nul

echo Iniciando Frontend (puerto 3000)...
start "Cableworld Frontend" cmd /k "node frontend-server.js"
timeout /t 2 /nobreak >nul

echo.
echo ✅ Servidores iniciados:
echo    • Backend:  http://localhost:5000
echo    • Frontend: http://localhost:3000
echo.
echo Puedes cerrar esta ventana. Los servidores seguirán corriendo.
echo.
pause
