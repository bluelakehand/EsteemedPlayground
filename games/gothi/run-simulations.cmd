@echo off
setlocal

where node >nul 2>nul
if %errorlevel% equ 0 (
  set "GOTHI_NODE=node"
) else (
  set "GOTHI_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

if not exist "%GOTHI_NODE%" if not "%GOTHI_NODE%"=="node" (
  echo Node.js was not found on PATH or in the Codex bundled runtime. 1>&2
  echo Reopen this project in Codex or install Node.js, then try again. 1>&2
  exit /b 1
)

"%GOTHI_NODE%" "%~dp0simulate.js" %*
exit /b %errorlevel%