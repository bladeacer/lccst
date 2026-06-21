.PHONY: benchmark-free clean-telemetry

PORT         ?= 8080
AGENT_NAME   ?= opencode
MODEL_NAME   ?= deepseek-v4-flash-free
AGENT_MODEL  := $(AGENT_NAME)-$(MODEL_NAME)

BENCH_DIR    := playground/benchmarks
PROMPT_FILE  := playground/agent-prompt.md

benchmark-free: clean-telemetry
	@echo "[Harness] Structuring isolation clean-room for $(AGENT_MODEL)..."
	@mkdir -p playground/$(AGENT_MODEL)
	
	@echo "[Harness] Starting interactive agent terminal session..."
	# Run from root so opencode.jsonc is loaded naturally, targeting the sandbox folder path
	$(AGENT_NAME) playground/$(AGENT_MODEL)

	@echo "\n[Harness] OpenCode exited. Parsing compiled outputs and runtime telemetry logs..."
	python3 $(BENCH_DIR)/run_benchmark.py $(AGENT_MODEL) --install-deps

	@echo "[Harness] Run complete. Purging transient workspace files..."
	# Clean the code subdirectories but leave the markdown report intact!
	@rm -rf playground/$(AGENT_MODEL)/go-login-crud
	@rm -rf playground/$(AGENT_MODEL)/python-http-server
	@rm -rf playground/$(AGENT_MODEL)/react-timer
	@echo "[Harness] Report preserved cleanly."
	@echo "[Harness] Standalone benchmark logs and versioned markdown reports preserved cleanly."

clean-telemetry:
	@echo "[Harness] Flushing trace telemetry caches..."
	# @rm -f $(BENCH_DIR)/runtime-telemetry.json
