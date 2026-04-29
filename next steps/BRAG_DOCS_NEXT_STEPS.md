# Brag Docs: Step-by-Step Improvement Plan

This roadmap helps evolve the feature from "raw git activity" to "high-quality, low-effort brag docs" with clear, incremental milestones.

## Phase 1: Stabilize Data Collection (Foundation)

1. **Keep current cross-platform repo scan stable**
   - Validate behavior on Windows, macOS, and Linux.
   - Add test runs on sample repos with known commit history.

2. **Add configurable time window**
   - Support CLI options like `--since "1 week ago"` and `--since "14 days ago"`.
   - Keep default as one week.

3. **Add optional author filtering**
   - CLI option: `--author "name or email"`.
   - Default behavior can remain "all authors" or be team-defined.

4. **Improve logging and diagnostics**
   - Show counts: repos scanned, repos matched, commits parsed, repos skipped.
   - Add `--verbose` mode for debugging.

## Phase 2: Improve Signal Quality (Less Noise, More Value)

5. **Filter noisy commits**
   - Exclude messages like: `wip`, `merge`, `typo`, `format`, `bump`.
   - Make this configurable via patterns.

6. **Group commits into work items**
   - Group by branch, issue key, or PR title when available.
   - Reduce long commit lists into meaningful units of work.

7. **Categorize entries automatically**
   - Categories: `Feature`, `Bug Fix`, `Reliability`, `Performance`, `Docs`, `Mentoring`.
   - Allow manual override.

8. **Add confidence score**
   - Score each generated item (`high`, `medium`, `low`) based on data completeness.
   - Route low-confidence items for quick review.

## Phase 3: Add Context Enrichment (Impact-Oriented Output)

9. **Link commits to PRs and issues**
   - Pull PR title, number, URL, and issue IDs.
   - Use these links to improve clarity and credibility.

10. **Capture review and collaboration signals**
   - Include meaningful PR reviews, approvals, and mentoring activity.
   - Distinguish coding work from collaboration impact.

11. **Add deployment/incident context**
   - If available, connect to deploy logs, incidents, or on-call outcomes.
   - Highlight operational impact, not just code changes.

## Phase 4: Generate Better Brag Summaries (Near Zero Effort)

12. **Generate outcome-first bullets**
   - Convert activity into impact statements:
   - Example: "Reduced checkout errors by improving retry handling in payments flow."

13. **Add templates for multiple audiences**
   - Weekly update template.
   - Performance review template.
   - Promotion packet template.

14. **Create lightweight review workflow**
   - "Accept all", "edit selected", "discard selected" actions.
   - Target review time: under 2 minutes per week.

## Phase 5: Publishing and Integrations (Adoption)

15. **Export targets**
   - Markdown (local file)
   - Notion page
   - Optional Slack draft post

16. **Automate schedule**
   - Weekly generation via cron/GitHub Action/local scheduler.
   - Send reminder only when there is meaningful activity.

17. **Add backfill mode**
   - Generate summaries for previous weeks/months for review cycles.

## Phase 6: Reliability, Privacy, and Team Rollout

18. **Add test coverage**
   - Unit tests for parsing, grouping, filtering, and formatting.
   - Snapshot tests for generated markdown output.

19. **Add privacy guardrails**
   - Redact secrets/tokens/PII patterns.
   - Add allowlist/denylist for repos and directories.

20. **Team configuration support**
   - Project-level config file (e.g. `bragdocs.config.json`).
   - Shared defaults for filters, categories, and output style.

## Recommended Immediate Next 3 Tasks

1. Add CLI options for `--since`, `--author`, and `--verbose`.
2. Add noisy commit filtering and basic work-item grouping.
3. Add markdown formatter that outputs weekly brag docs directly.

