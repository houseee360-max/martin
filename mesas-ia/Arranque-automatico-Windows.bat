@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "INICIO=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "DEST=%INICIO%\Mesas IA.vbs"

if not exist ".venv\instalado.txt" (
  echo.
  echo  Primero abre Iniciar-Restaurante.bat una vez y termina la instalacion.
  pause
  exit /b
)

> "%DEST%" echo Set s = CreateObject("WScript.Shell")
>> "%DEST%" echo s.CurrentDirectory = "%~dp0"
>> "%DEST%" echo s.Run """%~dp0Iniciar-Restaurante.bat"" --sin-navegador", 7, False

rem que el ordenador no se duerma mientras esta enchufado
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0

echo.
echo  Listo. Mesas IA arrancara solo cada vez que se encienda este ordenador.
echo  Tambien se desactivo la suspension cuando esta enchufado.
echo.
echo  IMPORTANTE: Windows tiene que entrar solo al escritorio (sin pedir contrasena),
echo  o alguien tiene que iniciar sesion despues de un corte de luz.
echo.
echo  Para quitarlo: abre Quitar-arranque-automatico.bat
pause
