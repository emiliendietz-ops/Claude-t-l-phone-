@echo off
cd /d "%~dp0"
echo Demarrage du serveur (BAES + entretien annuel)...
echo Ne fermez pas cette fenetre tant que l'application doit rester accessible.
echo.
node server.js
pause
