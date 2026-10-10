#!/usr/bin/env python3
"""Finalize daemon — watches VLM analysis progress and regenerates ERROR-REPORT.md.

Runs scripts/aggregate-audit.mjs whenever analysis.jsonl grows (batch progress)
and once more at completion. Double-fork + setsid → survives the tool-harness
session reaper (same pattern as start-dev-daemon.py / analyze-daemon.py).
"""
import os

PROJECT = "/home/z/my-project"
LOG_PATH = os.path.join(PROJECT, "agent-ctx/audit/finalize.log")

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
last=0
for i in $(seq 1 2400); do   # ~ up to 20h of 30s checks
  total=$(wc -l < agent-ctx/audit/manifest.jsonl 2>/dev/null || echo 0)
  done_n=0
  [ -f agent-ctx/audit/analysis.jsonl ] && done_n=$(wc -l < agent-ctx/audit/analysis.jsonl)
  if [ "$done_n" -gt "$last" ]; then
    echo "___ $(date +%H:%M:%S) analysis $done_n/$total — regenerating report ___"
    bun scripts/aggregate-audit.mjs
    last=$done_n
  fi
  if [ "$done_n" -ge "$total" ] && [ "$total" -gt 0 ]; then
    echo "FINAL_REPORT_GENERATED ($done_n/$total)"
    break
  fi
  sleep 30
done
"""])
        os._exit(127)
    os._exit(0)
os.waitpid(pid, 0)
print("finalize daemon detached (logs: agent-ctx/audit/finalize.log)")
