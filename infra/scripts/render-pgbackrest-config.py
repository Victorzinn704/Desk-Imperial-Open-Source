#!/usr/bin/env python3

import re
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 4:
        raise SystemExit(
            "Uso: render-pgbackrest-config.py <env-file> <template-file> <output-file>"
        )

    env_file = Path(sys.argv[1])
    template_file = Path(sys.argv[2])
    output_file = Path(sys.argv[3])

    pattern = re.compile(r"\$\{([A-Z0-9_]+)\}")
    env = {}

    for line in env_file.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        env[key.strip()] = value.strip()

    template = template_file.read_text(encoding="utf-8")

    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        value = env.get(key)
        if value is None or value == "":
            raise SystemExit(f"Variável obrigatória ausente para pgBackRest: {key}")
        return value

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(pattern.sub(replace, template), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
