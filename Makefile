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
	# Spin up opencode cleanly within the target runtime folder scope
	cd playground/$(AGENT_MODEL) && $(AGENT_NAME)

	@echo "\n[Harness] OpenCode exited. Parsing compiled outputs and runtime telemetry logs..."
	# Triggers the python parser to analyze FCT and look at the MCP runtime-telemetry.json logs
	python3 $(BENCH_DIR)/run_benchmark.py $(AGENT_MODEL) --install-deps

	@echo "[Harness] Run complete. Purging transient environment workspace directories..."
	@rm -rf playground/$(AGENT_MODEL)
	@echo "[Harness] Standalone benchmark logs and versioned markdown reports preserved cleanly."

clean-telemetry:
	@echo "[Harness] Flushing trace telemetry caches..."
	@rm -f $(BENCH_DIR)/runtime-telemetry.json
	@rm -rf playground/$(AGENT_MODEL)
