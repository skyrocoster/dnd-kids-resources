"""Reference-text parsing and validation helpers.

This module mirrors the shipped frontend reference-text semantics without any
framework or persistence dependencies. It keeps token metadata in a registry so
new token kinds can be added without changing the parser.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Generic, Mapping, TypeVar


Context = TypeVar("Context")


@dataclass(frozen=True)
class ReferenceDefinition(Generic[Context]):
    token: str
    kind: str
    domain: str
    fallback: str
    resolve: Callable[[Context], str | int | float | None]


ReferenceRegistry = Mapping[str, ReferenceDefinition[Context]]


def create_reference_registry(
    definitions: list[ReferenceDefinition[Context]] | tuple[ReferenceDefinition[Context], ...],
) -> dict[str, ReferenceDefinition[Context]]:
    registry: dict[str, ReferenceDefinition[Context]] = {}
    for definition in definitions:
        if definition.token in registry:
            raise ValueError(f"Duplicate reference token: {definition.token}")
        registry[definition.token] = definition
    return registry


def _malformed_error(message: str, start: int, end: int) -> dict[str, object]:
    return {
        "kind": "malformed",
        "message": message,
        "start": start,
        "end": end,
    }


def _find_malformed_references(source: str) -> list[dict[str, object]]:
    errors: list[dict[str, object]] = []
    cursor = 0

    while cursor < len(source):
        if source[cursor] == "}":
            errors.append(_malformed_error("Unmatched closing brace", cursor, cursor + 1))
            cursor += 1
            continue

        if source[cursor] != "{":
            cursor += 1
            continue

        close = source.find("}", cursor + 1)
        if close == -1:
            errors.append(_malformed_error("Unmatched opening brace", cursor, len(source)))
            break

        nested_open = source.find("{", cursor + 1)
        if nested_open != -1 and nested_open < close:
            errors.append(_malformed_error("Nested braces are not allowed", cursor, close + 1))
            cursor = close + 1
            continue

        if source[cursor + 1 : close].strip() == "":
            errors.append(_malformed_error("Reference token cannot be empty", cursor, close + 1))
        cursor = close + 1

    return errors


def parse_reference_text(source: str) -> dict[str, object]:
    errors = _find_malformed_references(source)
    if errors:
        return {"valid": False, "errors": errors}

    nodes: list[dict[str, object]] = []
    cursor = 0
    literal_start = 0

    while cursor < len(source):
        if source[cursor] != "{":
            cursor += 1
            continue

        if cursor > literal_start:
            nodes.append(
                {
                    "type": "text",
                    "text": source[literal_start:cursor],
                    "start": literal_start,
                    "end": cursor,
                },
            )

        close = source.find("}", cursor + 1)
        nodes.append(
            {
                "type": "reference",
                "token": source[cursor + 1 : close],
                "source": source[cursor : close + 1],
                "start": cursor,
                "end": close + 1,
            },
        )
        cursor = close + 1
        literal_start = cursor

    if literal_start < len(source):
        nodes.append(
            {
                "type": "text",
                "text": source[literal_start:],
                "start": literal_start,
                "end": len(source),
            },
        )

    return {"valid": True, "document": {"source": source, "nodes": nodes}}


def validate_reference_text(
    source: str,
    registry: ReferenceRegistry[Context],
) -> dict[str, object]:
    parsed = parse_reference_text(source)
    if not parsed["valid"]:
        return parsed

    document = parsed["document"]
    errors: list[dict[str, object]] = []
    for node in document["nodes"]:
        if node["type"] != "reference":
            continue
        if node["token"] in registry:
            continue
        errors.append(
            {
                "kind": "unknown",
                "message": f"Unknown reference token: {node['token']}",
                "token": node["token"],
                "start": node["start"],
                "end": node["end"],
            },
        )

    if errors:
        return {"valid": False, "errors": errors}
    return parsed


def resolve_reference_text(
    document: dict[str, object],
    registry: ReferenceRegistry[Context],
    context: Context,
) -> str:
    parts: list[str] = []
    for node in document["nodes"]:
        if node["type"] == "text":
            parts.append(str(node["text"]))
            continue

        definition = registry.get(str(node["token"]))
        if definition is None:
            parts.append("")
            continue

        value = definition.resolve(context)
        parts.append(definition.fallback if value is None else str(value))

    return "".join(parts)


@dataclass(frozen=True)
class SpellValueReferenceContext:
    spell_attack_bonus: int | float | None = None
    spell_save_dc: int | float | None = None


spell_value_reference_registry = create_reference_registry(
    [
        ReferenceDefinition[SpellValueReferenceContext](
            token="spell_attack_bonus",
            kind="value",
            domain="spell",
            fallback="your spell attack bonus",
            resolve=lambda context: context.spell_attack_bonus,
        ),
        ReferenceDefinition[SpellValueReferenceContext](
            token="spell_save_dc",
            kind="value",
            domain="spell",
            fallback="your spell save DC",
            resolve=lambda context: context.spell_save_dc,
        ),
    ],
)
