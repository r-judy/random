@echo off
chcp 65001 > nul
echo ==============================================
echo  🎉 스마트 발표자 뽑기 (Speaker Picker) 실행
echo ==============================================

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    where py >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [안내] Python이 시스템 PATH에 등록되어 있지 않습니다.
        echo index.html 파일을 더블 클릭하시면 웹 브라우저에서 바로 사용하실 수 있습니다!
        pause
        exit /b
    ) else (
        py main.py
    )
) else (
    python main.py
)
pause
