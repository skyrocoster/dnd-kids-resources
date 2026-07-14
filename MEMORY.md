# Project Memory

- Browser automation policy: do not drive Chrome, Playwright, or any browser UI unless the user explicitly
  asks for browser automation in the current turn. The user performs manual UI verification; agents should run
  automated tests/typecheck/build and report manual checks that remain.
