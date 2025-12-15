@echo off
chcp 65001 >nul
cls
echo.
echo 🔄 Reiniciando servidores de Cableworld...
echo.

echo ⏹️  Deteniendo procesos actuales...
taskkill /F /IM node.exe >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    echo ✓ Procesos detenidos
) else (
    echo ⚠️  No había procesos Node corriendo
)

timeout /t 2 /nobreak >nul
echo.

echo Iniciando Backend (puerto 5000)...
start "Cableworld Backend" cmd /k "cd backend && node server.js"
timeout /t 3 /nobreak >nul

echo Iniciando Frontend (puerto 3000)...
start "Cableworld Frontend" cmd /k "node frontend-server.js"
timeout /t 2 /nobreak >nul

echo.
echo ✅ Servidores reiniciados exitosamente:
echo    • Backend:  http://localhost:5000
echo    • Frontend: http://localhost:3000
echo.
echo Puedes cerrar esta ventana. Los servidores seguirán corriendo.
echo.
pause
