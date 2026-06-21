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
	# Explicitly pass the root config file down to the active runtime folder scope
	cd playground/$(AGENT_MODEL) && $(AGENT_NAME) --config ../../opencode.jsonc

	@echo "\n[Harness] OpenCode exited. Parsing compiled outputs and runtime telemetry logs..."
	python3 $(BENCH_DIR)/run_benchmark.py $(AGENT_MODEL) --install-deps

	@echo "[Harness] Run complete. Purging transient workspace files..."
	# Clean the code subdirectories but leave the markdown report intact!
	@pwd
	# @rm -rf playground/$(AGENT_MODEL)/**/plain
	# @rm -rf playground/$(AGENT_MODEL)/**/skill-guided
	@echo "[Harness] Report preserved cleanly."
	@echo "[Harness] Standalone benchmark logs and versioned markdown reports preserved cleanly."

clean-telemetry:
	@echo "[Harness] Flushing trace telemetry caches..."
	@rm -f $(BENCH_DIR)/runtime-telemetry.json
