import argparse
import pathlib
import re

PATTERN = re.compile(r"\d+\s*\(\{@damage\s+([^}]+)\}\)")


def replace_damage_annotations(text: str) -> tuple[str, int]:
    new_text, count = PATTERN.subn(r"\1", text)
    return new_text, count


def main() -> None:
    parser = argparse.ArgumentParser(description="Replace `N ({@damage XdY})` with `XdY` in JSON text files.")
    parser.add_argument("file", type=pathlib.Path, help="Path to the JSON file to update.")
    parser.add_argument("--backup", action="store_true", help="Write a backup file with extension .bak before editing.")
    args = parser.parse_args()

    path = args.file
    if not path.exists():
        raise SystemExit(f"File not found: {path}")

    text = path.read_text(encoding="utf-8")
    new_text, count = replace_damage_annotations(text)
    if count == 0:
        print("No matching damage annotations found.")
        return

    if args.backup:
        backup_path = path.with_suffix(path.suffix + ".bak")
        backup_path.write_text(text, encoding="utf-8")
        print(f"Backup written to {backup_path}")

    path.write_text(new_text, encoding="utf-8")
    print(f"Replaced {count} damage annotation(s) in {path}")


if __name__ == "__main__":
    main()
