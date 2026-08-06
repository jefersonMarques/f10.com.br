#!/usr/bin/env bash

set -euo pipefail

project_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dist_directory="${project_directory}/dist"
parts_directory="${dist_directory}/parts"
base64_file="${dist_directory}/f10-child-1.1.0.zip.b64"
package_file="${dist_directory}/f10-child-1.1.0.zip"
expected_checksum="559e7f03091b3c9ef781f48ad994f409ad2e0979c4d3722b61805dbee3f3f659"

cat "${parts_directory}"/f10-child-1.1.0.zip.b64.part-* > "${base64_file}"

if base64 --decode "${base64_file}" > "${package_file}" 2>/dev/null; then
    :
elif base64 -D "${base64_file}" > "${package_file}" 2>/dev/null; then
    :
else
    echo "Não foi possível decodificar o pacote Base64." >&2
    exit 1
fi

actual_checksum="$(sha256sum "${package_file}" | awk '{print $1}')"

if [[ "${actual_checksum}" != "${expected_checksum}" ]]; then
    echo "Checksum inválido para ${package_file}." >&2
    rm -f "${package_file}" "${base64_file}"
    exit 1
fi

rm -f "${base64_file}"

echo "Pacote restaurado em: ${package_file}"
