.PHONY: benchmark-free bench-update clean-telemetry

PORT         ?= 8080
AGENT_NAME   ?= opencode
MODEL_NAME   ?= deepseek-v4-flash-free
AGENT_MODEL  := $(AGENT_NAME)-$(MODEL_NAME)

BENCH_DIR    := playground/benchmarks
PROMPT_FILE  := playground/agent-prompt.md

# Default target: regenerate README table from existing benchmark reports
benchmark-free: clean-telemetry
	@echo "[Harness] Structuring isolation clean-room for $(AGENT_MODEL)..."
	@mkdir -p playground/$(AGENT_MODEL)
	
	@echo "[Harness] Starting interactive agent terminal session..."
	# Run from root so opencode.jsonc is loaded naturally, targeting the sandbox folder path
	$(AGENT_NAME) playground/$(AGENT_MODEL)

	@echo "[Harness] OpenCode exited. Parsing compiled outputs and runtime telemetry logs..."
	python3 $(BENCH_DIR)/run_benchmark.py $(AGENT_MODEL) --install-deps

	@echo "[Harness] Run complete. Purging transient workspace files..."
	# Clean the code subdirectories but leave the markdown report intact!
	@rm -rf playground/$(AGENT_MODEL)/go-login-crud
	@rm -rf playground/$(AGENT_MODEL)/python-http-server
	@rm -rf playground/$(AGENT_MODEL)/react-timer
	@echo "[Harness] Report preserved cleanly."
	@echo "[Harness] Standalone benchmark logs and versioned markdown reports preserved cleanly."

	$(MAKE) bench-update

bench-update:
	@echo "[Harness] Aggregating latest benchmark reports..."
	python3 scripts/update_readme_benchmarks.py

clean-telemetry:
	@echo "[Harness] Flushing trace telemetry caches..."
	@rm -f playground/${AGENT_MODEL}/playground/benchmarks/runtime-telemetry.json
	@rm -f playground/${AGENT_MODEL}/runtime-telemetry.json
	@rm -rf playground/$(AGENT_MODEL)/go-login-crud
	@rm -rf playground/$(AGENT_MODEL)/python-http-server
	@rm -rf playground/$(AGENT_MODEL)/react-timer
