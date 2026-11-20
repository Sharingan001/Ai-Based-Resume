# C++ score utility

This standalone C++17 CLI computes the same weighted final score as the Python API from four already-computed component scores. It does not parse documents, call Ollama, or replace TF-IDF. It is optional and the web application does not invoke it.

Install a C++17 compiler and CMake, then run from the project root:

```powershell
cmake -S cpp -B cpp/build
cmake --build cpp/build --config Release
ctest --test-dir cpp/build -C Release --output-on-failure
.\cpp\build\Release\nexus_score.exe 80 100 50 75
```

With single-configuration generators the executable is directly inside `cpp/build`. Expected score: `81.5`. All four inputs must be finite numbers between 0 and 100.

## Installed MinGW compiler

The installed GCC 6.3 compiler was verified at `C:\MinGW\bin\g++.exe`. CMake is optional; use this direct build on this machine:

```powershell
powershell -ExecutionPolicy Bypass -File cpp/build.ps1
.\cpp\build\nexus_score.exe 80 100 50 75
```

The script uses static linking so the executable does not require MinGW DLLs on PATH. Final scores use decimal half-up rounding to one decimal place, with a small tolerance for binary floating-point representation.
