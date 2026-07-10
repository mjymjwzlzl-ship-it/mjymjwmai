@echo off
echo ========================================
echo Android Studio SDK Manager 열기
echo ========================================
echo.

echo Android Studio를 실행합니다...
start "" "C:\Program Files\Android\Android Studio\bin\studio64.exe"

echo.
echo ========================================
echo Android Studio에서 SDK 설치하기:
echo ========================================
echo.
echo 1. Android Studio가 열리면:
echo    - Welcome 화면에서 "More Actions" → "SDK Manager" 클릭
echo    또는
echo    - 프로젝트가 열려있으면 File → Settings → Android SDK
echo.
echo 2. SDK Platforms 탭에서:
echo    - Android 13.0 (API 33) 체크
echo    - Android 14.0 (API 34) 체크
echo.
echo 3. SDK Tools 탭에서:
echo    - Android SDK Build-Tools 34 체크
echo    - Android SDK Platform-Tools 체크
echo    - Android SDK Command-line Tools 체크
echo.
echo 4. OK 클릭하여 설치
echo.
echo 5. 설치 완료 후 SDK 위치 확인:
echo    일반적으로 C:\Users\user\AppData\Local\Android\Sdk
echo.
pause

echo.
echo SDK 설치가 완료되면 아래 파일을 실행하세요:
echo D:\ARATA\simple-build.bat
echo.
pause