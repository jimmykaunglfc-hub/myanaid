## i18nexus

i18nexus is the source of truth for translations. Do not edit local translation JSON files directly.

For user-facing text changes, use the i18nexus MCP to add or update source-language strings. Call `get_i18nexus_mcp_guidance` for detailed rules. If the MCP is unavailable or lacks the required token scope, stop and tell the user instead of editing translation files.

Before running `i18nexus pull` after MCP string changes, check package.json for an `i18nexus listen` script. `i18nexus listen` automatically pulls translation JSON updates when strings change, so a manual pull is usually unnecessary while it is running. If `listen` is configured, do not pull unless the user explicitly asks. If `listen` is not configured, ask whether they are already running `i18nexus listen` in another shell and whether they want you to pull automatically after changes.

