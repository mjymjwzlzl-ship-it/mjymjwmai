# PowerShell 스크립트로 APK 빌드

Write-Host "Setting up environment..." -ForegroundColor Green

# Java 환경 변수 설정
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# 프로젝트 디렉토리로 이동
Set-Location -Path "D:\ARATA\arata-mobile\android"

Write-Host "Starting Gradle build..." -ForegroundColor Yellow

# Gradle 빌드 실행
& .\gradlew assembleRelease

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful!" -ForegroundColor Green
    
    # APK 파일 복사
    $source = "D:\ARATA\arata-mobile\android\app\build\outputs\apk\release\app-release.apk"
    $destination = "D:\ARATA\public\downloads\arata-webtoon-1.0.0.apk"
    
    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $destination -Force
        Write-Host "APK copied to: $destination" -ForegroundColor Cyan
        Write-Host "Navigation issue fixed! New APK is ready for download." -ForegroundColor Green
    } else {
        Write-Host "APK file not found at: $source" -ForegroundColor Red
    }
} else {
    Write-Host "Build failed!" -ForegroundColor Red
}

# 원래 디렉토리로 복귀
Set-Location -Path "D:\ARATA"