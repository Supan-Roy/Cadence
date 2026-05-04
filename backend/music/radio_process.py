import os
import re
import subprocess


def pid_is_alive(pid):
    if not pid:
        return False
    try:
        pid_int = int(pid)
    except (TypeError, ValueError):
        return False

    try:
        if os.name == "nt":
            try:
                result = subprocess.run(
                    ["tasklist", "/FI", f"PID eq {pid_int}", "/NH"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    check=False,
                )
            except (OSError, subprocess.TimeoutExpired):
                return False
            stdout = result.stdout or ""
            return bool(re.search(rf"\b{pid_int}\b", stdout))

        try:
            os.kill(pid_int, 0)
        except OSError:
            return False
        return True
    except Exception:
        return False
