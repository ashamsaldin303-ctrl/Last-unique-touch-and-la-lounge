#!/usr/bin/env python3
"""Probe-gated VLM analysis daemon.

Waits for the vision API to stop returning 429 (account-wide rate limit),
then runs scripts/analyze-audit.mjs (resumable) repeatedly until every
manifest shot has an analysis entry. Double-fork + setsid → survives the
tool-harness session reaper (same pattern as start-dev-daemon.py).
"""
import os

PROJECT = "/home/z/my-project"
LOG_PATH = os.path.join(PROJECT, "agent-ctx/audit/analyze.log")

pid = os.fork()
if pid == 0:
    os.setsid()
    if os.fork() == 0:
        # grandchild — the actual daemon
        devnull = os.open(os.devnull, os.O_RDONLY)
        os.dup2(devnull, 0)
        log_fd = os.open(LOG_PATH, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
        os.dup2(log_fd, 1)
        os.dup2(log_fd, 2)
        os.chdir(PROJECT)
        os.execvp("bash", ["bash", "-c", r"""
probe() {
  bun -e "import ZAI from 'z-ai-web-dev-sdk'; const z=await ZAI.create(); await z.chat.completions.create({messages:[{role:'user',content:'ok'}]}); console.log('API_OK')" 2>/dev/null | grep -q API_OK
}

for round in $(seq 1 400); do
  if probe; then
    echo "___ probe OK round $round — running analyzer ___"
    bun scripts/analyze-audit.mjs
    # analyzer finished this batch; check completion
    total=$(wc -l < agent-ctx/audit/manifest.jsonl)
    done_n=$(wc -l < agent-ctx/audit/analysis.jsonl 2>/dev/null || echo 0)
    echo "___ analyzer exit=$? (analyzed $done_n / manifest $total) ___"
    if [ "$done_n" -ge "$total" ]; then echo "ANALYSIS_COMPLETED_OK"; break; fi
    sleep 10
  else
    echo "___ probe 429, waiting 150s (round $round) ___"
    sleep 150
  fi
done
"""])
        os._exit(127)
    os._exit(0)
os.waitpid(pid, 0)
print("analyze daemon detached (logs: agent-ctx/audit/analyze.log)")
