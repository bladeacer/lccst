#!/usr/bin/env python3
"""Dedicated API proxy with active console debugging for ART capturing."""

import json
import select
import socket
import sys
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

HERE = Path(__file__).resolve().parent
TELEMETRY_FILE = HERE / "runtime-telemetry.json"


def _load_telemetry():
    if TELEMETRY_FILE.exists():
        try:
            return json.loads(TELEMETRY_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {"total_prompt_tokens": 0, "total_completion_tokens": 0, "total_tokens": 0, "turns": 0}


def _save_telemetry(data):
    TELEMETRY_FILE.write_text(json.dumps(data, indent=2))


def _accumulate_usage(usage: dict):
    pt = usage.get("prompt_tokens", 0) or 0
    ct = usage.get("completion_tokens", 0) or 0
    if pt == 0 and ct == 0:
        return
    telemetry = _load_telemetry()
    telemetry["total_prompt_tokens"] += pt
    telemetry["total_completion_tokens"] += ct
    telemetry["total_tokens"] += pt + ct
    telemetry["turns"] += 1
    _save_telemetry(telemetry)
    print(f"  [METRICS CAPTURED] +{pt} Prompt, +{ct} Completion tokens. Total turns: {telemetry['turns']}")


class ProxyHandler(BaseHTTPRequestHandler):
    upstream_base = "https://api.deepseek.com"

    def do_GET(self): self._dispatch("GET")
    def do_POST(self): self._dispatch("POST", self._read_body())
    def do_PUT(self): self._dispatch("PUT", self._read_body())
    def do_DELETE(self): self._dispatch("DELETE")
    def do_CONNECT(self): self._relay_tunnel()

    def _dispatch(self, method, body=None):
        if self.path.startswith(("http://", "https://")):
            url = self.path
            print(f"[{method}] Forward Proxy Target: {url}")
        else:
            if "anthropic" in self.path:
                base = "https://api.anthropic.com"
            elif "openai" in self.path:
                base = "https://api.openai.com"
            else:
                base = self.upstream_base
            url = base + self.path
            print(f"[{method}] Reverse Proxy Routed: {url}")
            
        self._forward_and_capture(method, url, body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length) if length > 0 else None

    def _upstream_headers(self):
        h = {}
        for k, v in self.headers.items():
            if k.lower() not in ("host", "content-length", "transfer-encoding", "proxy-connection", "proxy-authorization"):
                h[k] = v
        return h

    def _is_streaming_response(self, headers):
        return "text/event-stream" in headers.get("Content-Type", "")

    # Re-enabled standard console logger
    def log_message(self, fmt, *args):
        sys.stderr.write(f"  [HTTP LOG] {fmt % args}\n")

    def _forward_and_capture(self, method, url, body):
        headers = self._upstream_headers()
        req = Request(url, data=body, headers=headers, method=method)
        try:
            resp = urlopen(req)
            
            if self._is_streaming_response(resp.headers):
                print("  [STREAM] Detected Server-Sent Events (SSE) pipe. Processing lines...")
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ("transfer-encoding", "content-encoding", "content-length"):
                        self.send_header(k, v)
                self.end_headers()

                while True:
                    line = resp.readline()
                    if not line:
                        break
                    self.wfile.write(line)
                    self.wfile.flush()
                    
                    text_line = line.decode("utf-8", errors="replace")
                    if text_line.startswith("data: ") and not text_line.startswith("data: [DONE]"):
                        try:
                            data = json.loads(text_line[6:])
                            if isinstance(data, dict) and "usage" in data:
                                _accumulate_usage(data["usage"])
                        except json.JSONDecodeError: pass
            else:
                resp_body = resp.read()
                self._try_capture_usage(resp_body)
                self._send_response(resp.status, resp.headers, resp_body)
                
        except HTTPError as e:
            print(f"  [UPSTREAM ERROR] Code {e.code}")
            self._send_response(e.code, e.headers, e.read())
        except URLError as e:
            print(f"  [NETWORK FAILURE] Upstream unreachable: {e.reason}")
            self._send_error(502, f"Upstream unreachable: {e.reason}")

    def _try_capture_usage(self, resp_body):
        try:
            data = json.loads(resp_body)
            if isinstance(data, dict) and "usage" in data:
                _accumulate_usage(data["usage"])
        except (json.JSONDecodeError, UnicodeDecodeError): pass

    def _send_response(self, status, resp_headers, body):
        self.send_response(status)
        for k, v in resp_headers.items():
            if k.lower() not in ("transfer-encoding", "content-encoding", "content-length"):
                self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, code, message):
        body = json.dumps({"error": {"message": message, "type": "proxy_error"}}).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _relay_tunnel(self):
        host_port = self.path
        print(f"[CONNECT] Spawning secure HTTPS tunnel to: {host_port}")
        try:
            host, port_str = host_port.split(":", 1)
            port = int(port_str)
        except (ValueError, IndexError):
            self._send_error(400, f"Invalid CONNECT target: {host_port}")
            return

        try:
            upstream = socket.create_connection((host, port), timeout=15)
        except OSError as e:
            print(f"  [TUNNEL REJECTED] Connection failed: {e}")
            self._send_error(502, f"CONNECT failed: {e}")
            return

        self.send_response(200, "Connection Established")
        self.end_headers()

        client = self.connection
        client.setblocking(False)
        upstream.setblocking(False)
        done = threading.Event()

        def _relay(src, dst, label):
            try:
                while not done.is_set():
                    r, _, _ = select.select([src], [], [], 0.5)
                    if r:
                        data = src.recv(65536)
                        if not data:
                            break
                        dst.sendall(data)
            except (OSError, ConnectionError):
                pass
            finally:
                done.set()

        t1 = threading.Thread(target=_relay, args=(client, upstream, "C->U"), daemon=True)
        t2 = threading.Thread(target=_relay, args=(upstream, client, "U->C"), daemon=True)
        t1.start(); t2.start()
        
        while not done.wait(timeout=0.5):
            pass
            
        try: upstream.close()
        except OSError: pass


if __name__ == "__main__":
    port = 8080
    if len(sys.argv) > 1:
        try: port = int(sys.argv[1])
        except ValueError: pass
            
    server = HTTPServer(("localhost", port), ProxyHandler)
    print(f"--- Telemetry Debug Server Online on Port {port} ---")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Debug Server.")
        server.server_close()
