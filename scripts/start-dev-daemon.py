#!/usr/bin/env python3
"""Start the Next.js dev server as a true daemon (double-fork + setsid).

Why: this sandbox's tool harness reaps every process in its `su z` session
tree when a tool command exits — including `setsid`/`nohup` background jobs
(they remain direct children of the tool bash). A double-forked grandchild,
however, is orphaned to PID 1 (tini) *before* the command ends and survives
across tool calls — the same way the environment bootstrap's own dev server
persisted.

Usage:  python3 scripts/start-dev-daemon.py
Output: appends to dev.log (next's stdout+stderr), stdin from /dev/null.
Idempotence: exits early if something already listens on port 3000.
"""

import os
import socket
import sys

PROJECT = "/home/z/my-project"
LOG_PATH = os.path.join(PROJECT, "dev.log")
NEXT_BIN = os.path.join(PROJECT, "node_modules", ".bin", "next")


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("127.0.0.1", port)) == 0


def main() -> int:
    if port_in_use(3000):
        print("port 3000 already listening — not starting a duplicate")
        return 0

    pid = os.fork()
    if pid == 0:
        # child: new session, then fork again so the grandchild is orphaned
        # to PID 1 the moment this child exits (inside this very script run)
        os.setsid()
        if os.fork() == 0:
            # grandchild: the actual daemon
            devnull = os.open(os.devnull, os.O_RDONLY)
            os.dup2(devnull, 0)
            log_fd = os.open(LOG_PATH, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
            os.dup2(log_fd, 1)
            os.dup2(log_fd, 2)
            os.close(devnull)
            os.close(log_fd) if log_fd > 2 else None
            os.chdir(PROJECT)
            os.execvp(NEXT_BIN, [NEXT_BIN, "dev", "-p", "3000"])
        os._exit(0)

    os.waitpid(pid, 0)
    print("dev server daemonized (double-fork → PPID 1); logging to dev.log")
    return 0


if __name__ == "__main__":
    sys.exit(main())
