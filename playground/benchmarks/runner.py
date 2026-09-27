#!/usr/bin/env python3
"""CLI wrapper to launch telemetry pipelines alongside or standalone from target scripts."""

import argparse
import os
import sys
import subprocess
import threading
from http.server import HTTPServer
from track_runtime import ProxyHandler, TELEMETRY_FILE


def execute_agent(cmd_args, port):
    env = os.environ.copy()
    proxy_url = f"http://localhost:{port}"
    env["HTTP_PROXY"] = proxy_url
    env["HTTPS_PROXY"] = proxy_url

    print(f"[Runner] Spawning agent workspace process: {' '.join(cmd_args)}")
    try:
        result = subprocess.run(cmd_args, env=env)
        print(f"[Runner] Process exited with structural code: {result.returncode}")
    except FileNotFoundError:
        print(f"[Runner] Executable target error: '{cmd_args[0]}' could not be resolved.", file=sys.stderr)
    except Exception as e:
        print(f"[Runner] Execution crashed: {e}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="Clean-room agent benchmarking loops.")
    parser.add_argument("--port", type=int, default=8080, help="Proxy listener port allocation")
    parser.add_argument("--upstream", default="https://api.deepseek.com", help="Fallback target base")
    parser.add_argument("--daemon", action="store_true", help="Launch proxy standalone in foreground")
    parser.add_argument("command", nargs=argparse.REMAINDER, help="Target application call boundary")

    args = parser.parse_args()

    # Configure handler settings globally 
    ProxyHandler.upstream_base = args.upstream.rstrip("/")
    
    # Resolve command inputs
    cmd = args.command
    if cmd and cmd[0] == "--":
        cmd = cmd[1:]

    if args.daemon or not cmd:
        # Standalone Foreground mode for Pane 1
        server = HTTPServer(("localhost", args.port), ProxyHandler)
        print(f"[System] Telemetry standalone logging server active on port {args.port}...")
        print(f"[System] Writing telemetry to {TELEMETRY_FILE}")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            server.server_close()
        sys.exit(0)

    # Integrated execution mode
    server = HTTPServer(("localhost", args.port), ProxyHandler)
    daemon_thread = threading.Thread(target=server.serve_forever, daemon=True)
    daemon_thread.start()

    execute_agent(cmd, args.port)
    server.shutdown()
    server.server_close()


if __name__ == "__main__":
    main()
