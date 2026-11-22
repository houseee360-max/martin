@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Mesas IA - NO CERRAR ESTA VENTANA

set PY=
where py >nul 2>nul && set PY=py -3
if not defined PY (
  python --version >nul 2>nul && set PY=python
)
if not defined PY goto sinpython

if not exist ".venv\instalado.txt" (
  echo.
  echo  Primera vez: instalando lo necesario. Tarda unos minutos, no cierres la ventana...
  echo.
  if not exist ".venv\Scripts\python.exe" %PY% -m venv .venv || goto error
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt || goto error
  echo ok> ".venv\instalado.txt"
)

:bucle
echo.
echo  Mesas IA en marcha. Minimiza esta ventana, pero NO la cierres.
".venv\Scripts\python.exe" -m mesas --config config.json %*
echo.
echo  Mesas IA se detuvo. Vuelve a arrancar en 10 segundos (cierra la ventana para pararlo del todo)...
timeout /t 10 /nobreak >nul
goto bucle

:sinpython
echo.
echo  No encuentro Python en este ordenador.
echo  1. Se abrira la pagina de descarga: instala Python y MARCA la casilla "Add python.exe to PATH".
echo  2. Cuando termine, vuelve a abrir este archivo.
start https://www.python.org/downloads/
pause
exit /b

:error
echo.
echo  Algo fallo durante la instalacion. Haz una foto a lo que sale arriba y enviamela.
pause
exit /b
