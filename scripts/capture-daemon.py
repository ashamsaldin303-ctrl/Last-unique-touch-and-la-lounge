#!/usr/bin/env python3
"""Start the screenshot-capture supervisor as a true daemon (double-fork + setsid).

Same survival pattern as scripts/start-dev-daemon.py: the tool harness reaps
every process in the tool bash session tree when a command exits, but a
double-forked grandchild orphaned to PID 1 (tini) survives across calls.

The supervisor bash loop runs scripts/capture-audit.mjs repeatedly (node
re-reads the manifest each start = resumable) until the script exits 0.
"""
import os
import sys

PROJECT = "/home/z/my-project"
LOG_PATH = os.path.join(PROJECT, "agent-ctx/audit/capture.log")

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
for i in $(seq 1 60); do
  node --max-old-space-size=384 scripts/capture-audit.mjs
  code=$?
  if [ $code -eq 0 ]; then echo "SCRIPT_COMPLETED_OK" >> agent-ctx/audit/capture.log; break; fi
  echo "___ supervisor restart $i (exit $code) ___" >> agent-ctx/audit/capture.log
  sleep 3
done
"""])
        os._exit(127)
    os._exit(0)
os.waitpid(pid, 0)
print("capture daemon supervisor detached (logs: agent-ctx/audit/capture.log)")
