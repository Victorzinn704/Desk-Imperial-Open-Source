@echo off
setlocal

set ROOT=C:\Users\Desktop\Documents\test1

start "partner-api" /min cmd /c "cd /d %ROOT% && npm --workspace @partner/api run dev > api-dev.log 2> api-dev.err.log"
start "partner-web" /min cmd /c "cd /d %ROOT% && npm --workspace @partner/web run dev > web-dev.log 2> web-dev.err.log"

endlocal
