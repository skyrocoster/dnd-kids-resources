# Project Memory

- Browser verification is handled by the `browser-automation-luna` subagent through the repository's
  Playwright MCP server. It may start and stop the local app with `scripts/start_server.ps1` and
  `scripts/stop_server.ps1`, and returns live UI evidence to the coordinator.
