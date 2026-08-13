---
name: browser-validation-invoke
description: Invoke-only isolated browser validation for coordinator and validator evidence.
---

# Browser validation invocation

This is an invoke-only validation boundary. Arm the repository read guard before
running `scripts/browser_validation.py`; do not read that source, edit repository
files, reuse servers or profiles, or interpret the result as implementation proof.

Invoke with repository-local evidence. Omit `--output` for the default folder
`artifacts/browser-validation-<case-id>`, or provide one single folder name with
`--output <named-folder>`; absolute paths and traversal are rejected.

```text
.venv\Scripts\python.exe scripts\browser_validation.py --case <case-id> --scenario weapon-edit-dialog
```

Return the JSON result and artifact paths. `PASS`, `PRODUCT_FAIL`, and `INFRA_FAIL`
must remain distinct. Independent live invocation is owned by coordinator/validator.
