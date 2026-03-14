#!/bin/bash
set -e

# Detect HashLink install path
if [ -d "/opt/homebrew/Cellar/hashlink" ]; then
    HL_DIR=$(ls -d /opt/homebrew/Cellar/hashlink/*/  | head -1)
elif [ -d "/usr/local/include" ] && [ -f "/usr/local/lib/libhl.dylib" -o -f "/usr/local/lib/libhl.so" ]; then
    HL_DIR="/usr/local"
else
    echo "HashLink not found. Install with: brew install hashlink"
    exit 1
fi

HL_INCLUDE="${HL_DIR}/include"
HL_LIB="${HL_DIR}/lib"

echo "Using HashLink at: ${HL_DIR}"

# Step 1: Haxe → C
echo "Compiling Haxe → C..."
rm -rf hlc_out && mkdir -p hlc_out
haxe build.hl.hxml

# Step 2: C → native binary
echo "Compiling C → native..."
HDLLS=""
for lib in fmt sdl ui ssl uv openal heaps; do
    if [ -f "${HL_LIB}/${lib}.hdll" ]; then
        HDLLS="${HDLLS} ${HL_LIB}/${lib}.hdll"
    fi
done

cd hlc_out
cc -O2 -o ../game_native -std=c11 \
    -I "${HL_INCLUDE}" -I . \
    main.c \
    -L "${HL_LIB}" -lhl -lm -lpthread \
    $(pkg-config --libs libuv 2>/dev/null || echo "-luv") \
    ${HDLLS} \
    -Wl,-rpath,"${HL_LIB}"
cd ..

echo "Built: ./game_native"
echo "Run with: DYLD_LIBRARY_PATH=${HL_LIB} ./game_native"
