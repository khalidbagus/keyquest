#!/usr/bin/env bash
set -euo pipefail

demo_dir=$(cd "$(dirname "$0")" && pwd)
build_dir=${RIVE_DEMO_BUILD_DIR:-"${XDG_CACHE_HOME:-$HOME/.cache}/keyquest-rive-splash"}
web_commit=1d4622a903e8fe6a7c9b04a8dabe549f7de31e21
runtime_commit=bc35f5062f9d9c3e7cca81de9bdd1cfe02579bf3

mkdir -p "$build_dir" "$demo_dir/generated"
cd "$build_dir"

for repo_revision in "rive-wasm:$web_commit" "rive-runtime:$runtime_commit"; do
    repo=${repo_revision%:*}
    revision=${repo_revision#*:}
    if [[ ! -f "$repo-$revision/LICENSE" ]]; then
        curl --fail --silent --show-error --location --retry 2 \
            "https://codeload.github.com/rive-app/$repo/tar.gz/$revision" -o "$repo.tar.gz"
        tar -xzf "$repo.tar.gz"
    fi
done

web_dir="$PWD/rive-wasm-$web_commit"
runtime_dir="$PWD/rive-runtime-$runtime_commit"
submodule_path="$web_dir/wasm/submodules/rive-runtime"
mkdir -p "$(dirname "$submodule_path")"
if [[ ! -L "$submodule_path" ]]; then
    if [[ -d "$submodule_path" ]]; then
        rmdir "$submodule_path"
    fi
    ln -s "$runtime_dir" "$submodule_path"
fi

cd "$web_dir"
if ! git apply --reverse --check "$demo_dir/clear-splash.patch" 2>/dev/null; then
    git apply "$demo_dir/clear-splash.patch"
fi

cd wasm
./build_flavor.sh canvas_advanced_lite

output_dir=build/canvas_advanced_lite/bin/release
cp "$output_dir/canvas_advanced_c2d_only.mjs" "$demo_dir/generated/"
cp "$output_dir/canvas_advanced_c2d_only.wasm" "$demo_dir/generated/"
cp "$runtime_dir/tests/unit_tests/assets/watermark_playback_test.riv" "$demo_dir/generated/"
cp "$web_dir/LICENSE" "$demo_dir/generated/rive-wasm-LICENSE.txt"
cp "$runtime_dir/LICENSE" "$demo_dir/generated/rive-runtime-LICENSE.txt"
