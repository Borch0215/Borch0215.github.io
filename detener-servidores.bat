@echo off
chcp 65001 >nul
cls
echo.
echo 🛑 Deteniendo servidores de Cableworld...
echo.

tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ⏹️  Terminando procesos Node...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 1 /nobreak >nul
    echo ✓ Todos los procesos han sido detenidos
) else (
    echo ⚠️  No hay procesos Node corriendo en el sistema
)

echo.
echo ✅ Servidores detenidos correctamente
echo.
pause
