@echo off
title Servidores da Simulacao Industria 4.0
color 0b

echo ===================================================
echo   INICIANDO AMBIENTE LOCAL - INDUSTRIA 4.0
echo ===================================================
echo.
echo Automatizando o terminal para subir a API e o React.
echo.

echo [1/2] Entrando na pasta API e ligando a mente do sistema (Node.js na porta 3001)...
start "Node API - Cérebro" cmd /k "cd api && node server.js"

echo [2/2] Entrando na pasta Frontend e ligando a parte visual (React na porta 5173)...
start "React App - Visual" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo  TUDO INICIADO COM SUCESSO! 
echo ===================================================
echo A pagina da web se abrira em poucos segundos no seu navegador...
timeout /t 4 >nul
start http://localhost:5173
exit
