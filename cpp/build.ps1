$ErrorActionPreference = "Stop"
$compiler = Get-Command g++ -ErrorAction SilentlyContinue
if (-not $compiler -and (Test-Path 'C:\MinGW\bin\g++.exe')) {
    $compiler = Get-Item 'C:\MinGW\bin\g++.exe'
}
if (-not $compiler) { throw "g++ not found. Add your compiler bin directory to PATH." }
$compilerPath = if ($compiler.Source) { $compiler.Source } else { $compiler.FullName }
$env:Path = (Split-Path $compilerPath) + ';' + $env:Path
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'build') | Out-Null
& $compilerPath -std=c++17 -Wall -Wextra -Werror -O2 -static (Join-Path $PSScriptRoot 'main.cpp') -o (Join-Path $PSScriptRoot 'build/nexus_score.exe')
if ($LASTEXITCODE -ne 0) { throw "C++ compilation failed" }
& (Join-Path $PSScriptRoot 'build/nexus_score.exe') 80 100 50 75
if ($LASTEXITCODE -ne 0) { throw "C++ smoke test failed" }
