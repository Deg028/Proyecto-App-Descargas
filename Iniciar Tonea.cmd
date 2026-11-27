@echo off
rem Abre Tonea (app de escritorio). Quita ELECTRON_RUN_AS_NODE por si el terminal la tiene definida.
set ELECTRON_RUN_AS_NODE=
cd /d "%~dp0"
if not exist node_modules call npm install
if "%1"=="debug" ( call npm run app:debug ) else if "%1"=="movil" ( call npm run app:movil ) else if "%1"=="lan" ( call npm run app:lan ) else ( call npm run app )
