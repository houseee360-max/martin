@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Mesas IA

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

echo.
echo  Arrancando Mesas IA con la webcam... (la primera vez descarga el modelo, 5 MB)
".venv\Scripts\python.exe" -m mesas --presentacion %*
echo.
echo  Mesas IA se ha detenido.
pause
exit /b

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
