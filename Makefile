.PHONY: help default build test tag release clean clean-telemetry bench-update bench-list bench-config benchmark-free bench-report bench-cleanup telemetry-build benchmark-dryrun test_swarm test_telemetry test_e2e test_picker test_picker_tty test_mcp telemetry-settle

VERSION      ?= $(shell node -p "require('./package.json').version")
HARNESS      ?= opencode
E2E_HARNESS  ?=
AGENT_NAME   ?= $(HARNESS)
BENCH_PICK   ?= 1
PROVIDER     ?= opencode-zen
MODEL_NAME   ?= deepseek-v4-flash-free
AGENT_MODEL  := $(PROVIDER)-$(HARNESS)-$(MODEL_NAME)
BENCH_DIR    := playground/benchmarks

# Model identifier that the harness config pins, such as `kilo/stepfun/step:free`.
BENCH_MODEL_ID ?= $(PROVIDER)/$(MODEL_NAME)
# Configuration file of the running harness.
BENCH_CONFIG   ?= $(if $(filter opencode,$(HARNESS)),opencode.json,kilo.json)
# The clean room sits outside the repository, so a harness can never reach a
# tracked file of the project and no ancestor instruction file can reach it.
BENCH_TMP      ?= $(if $(TMPDIR),$(TMPDIR),/tmp)
BENCH_WORKSPACE := $(BENCH_TMP)/lccst-bench-$(AGENT_MODEL)
# Path of the telemetry server, relative to the workspace.
BENCH_MCP_PATH  = $(shell python3 -c "import os; print(os.path.relpath('$(CURDIR)/$(TELEMETRY_MCP_DIR)/build/index.js', '$(BENCH_WORKSPACE)'))")
# The task that the picker hands to the harness.
BENCH_TASK     ?= Read AGENTS.md and follow it exactly. Implement every subproject and both variants, run the guided tests, and record each phase with log_turn_telemetry. Begin now.
CONFIG_FILE  ?=

# Refuse to remove a workspace path that is empty, the root, or a parent of the
# repository. The clean room path comes from make variables, so a bad value
# must not turn into a broad delete.
define guard_workspace
	case "$(BENCH_WORKSPACE)" in \
		"") echo "[Harness] Refusing to use an empty workspace path."; exit 1 ;; \
		"/") echo "[Harness] Refusing to use the root as a workspace."; exit 1 ;; \
	esac; \
	case "$(CURDIR)" in \
		"$(BENCH_WORKSPACE)"*) echo "[Harness] Refusing to remove the repository."; exit 1 ;; \
	esac;
endef

default: help

help:
	@echo "LCCST (Locust) - Deterministic Workspace Gatekeeper"
	@echo ""
	@echo "Usage:"
	@echo "  make build              Compile TypeScript -> dist/index.js"
	@echo "  make test               Run all tests (unit + integration)"
	@echo "  make test_swarm         Run swarm library unit tests"
	@echo "  make test_telemetry     Run telemetry MCP unit tests"
	@echo "  make test_picker        Run benchmark picker unit tests"
	@echo "  make test_picker_tty    Run benchmark picker tests in a pseudo terminal"
	@echo "  make test_e2e           Run telemetry end-to-end tests on real harnesses"
	@echo "  make test_mcp           Run MCP server integration tests"
	@echo "  make tag                Create and push git tag v$(VERSION)"
	@echo "  make release            Alias for: make tag"
	@echo "  make benchmark-free     Pick a model, then run the full benchmark"
	@echo "  make bench-list         List the models that the picker offers"
	@echo "  make benchmark-dryrun   Build MCPs & verify connectivity (no agent session)"
	@echo "  make bench-report       Settle telemetry & write the report"
	@echo "  make bench-update       Regenerate README benchmark tables from latest reports"
	@echo "  make bench-cleanup      Remove the workspace of a run"
	@echo "  make clean              Remove dist/ directory"
	@echo "  make help               Show this message"
	@echo ""
	@echo "Variables:"
	@echo "  VERSION=$(VERSION)      HARNESS=$(HARNESS)  PROVIDER=$(PROVIDER)  MODEL_NAME=$(MODEL_NAME)"
	@echo "  AGENT_MODEL=$(AGENT_MODEL)   (provider-harness-model)"
	@echo "  BENCH_MODEL_ID=$(BENCH_MODEL_ID)   Model id pinned in the harness config"
	@echo "  BENCH_WORKSPACE=$(BENCH_WORKSPACE)"
	@echo "  BENCH_PICK=$(BENCH_PICK)   Set to 0 to skip the picker and use the variables"
	@echo "  BENCH_ALLOW_PIPE   Set to 1 to let a script choose a model without a terminal"
	@echo "  BENCH_ALL_MODELS   Set to 1 to offer every model, not only the free ones"
	@echo "  BENCH_TASK             Task that the picker hands to the harness"
	@echo "  CONFIG_FILE=$(CONFIG_FILE)   Path to custom agent config template"
	@echo "  E2E_HARNESS=$(if $(E2E_HARNESS),$(E2E_HARNESS),all)   Harness for the end-to-end telemetry test"
	@echo ""
	@echo "Example:"
	@echo "  make tag VERSION=3.1.0"
	@echo "  make benchmark-free CONFIG_FILE=./claude.jsonc"

build:
	pnpm run build

test:
	pnpm run test

test_swarm:
	pnpm tsx scripts/test-swarm-unit.ts

test_telemetry:
	pnpm tsx scripts/test-telemetry-usage.ts

test_picker:
	pnpm tsx scripts/test-benchmark-picker.ts

test_picker_tty:
	python3 scripts/test-picker-interactive.py

test_e2e: telemetry-build
	pnpm tsx scripts/test-telemetry-e2e.ts $(E2E_HARNESS)

test_mcp:
	pnpm run build && pnpm tsx scripts/test-connection.ts

tag:
	@echo "[Release] Creating and pushing git tag v$(VERSION)..."
	git tag "v$(VERSION)" -m "$(VERSION)"
	git push origin "v$(VERSION)"
	@echo "[Release] Tag pushed. GitHub Actions will draft the release."
	@echo "[Release] See https://github.com/bladeacer/lccst/actions"

release: tag

clean:
	rm -rf dist

TELEMETRY_MCP_DIR := playground/benchmarks/mcp-telemetry

telemetry-build:
	@echo "[Harness] Building telemetry MCP server..."
	@cd $(TELEMETRY_MCP_DIR) && pnpm install --ignore-workspace && pnpm run build

define GENERATE_HARNESS_CONFIG
{
  "model": "$(BENCH_MODEL_ID)",
  "instructions": ["AGENTS.md"],
  "snapshot": false,
  "mcp": {
    "lccst": {
      "enabled": false
    },
    "headroom": {
      "enabled": false
    },
    "lccst-telemetry": {
      "type": "local",
      "command": ["node", "$(BENCH_MCP_PATH)"],
      "enabled": true
    }
  }
}
endef
export GENERATE_HARNESS_CONFIG

benchmark-free: telemetry-build
	@if [ "$(BENCH_PICK)" = "1" ]; then \
		pnpm tsx scripts/benchmark-picker.ts benchmark-free; \
	else \
		$(MAKE) --no-print-directory benchmark-run; \
	fi

benchmark-run: clean-telemetry
	@echo "[Harness] Building the clean room for $(AGENT_MODEL)..."
	@$(call guard_workspace)
	@rm -rf "$(BENCH_WORKSPACE)"
	@mkdir -p "$(BENCH_WORKSPACE)"
	@echo "[Harness] Seeding the workspace files..."
	@cp SKILL.md "$(BENCH_WORKSPACE)/SKILL.md"
	@cp playground/README.md "$(BENCH_WORKSPACE)/README.md"
	@cp playground/guide.md "$(BENCH_WORKSPACE)/guide.md"
	@cp playground/agent-prompt.md "$(BENCH_WORKSPACE)/agent-prompt.md"
	@cp playground/agent-prompt.md "$(BENCH_WORKSPACE)/AGENTS.md"
	+$(MAKE) --no-print-directory bench-config
	@echo "[Harness] Workspace: $(BENCH_WORKSPACE)"
	@echo "[Harness] Harness:  $(HARNESS) with $(BENCH_MODEL_ID)"
	@echo "[Harness] Starting the run in the foreground. Answer the harness, or type"
	@echo "[Harness] a new message to steer it. The run ends when you leave the TUI."
	@cd "$(BENCH_WORKSPACE)" && $(HARNESS) --prompt "$(BENCH_TASK)"; \
	STATUS=$$?; \
	if [ $$STATUS -ne 0 ]; then \
		echo "[Harness] The harness left with status $$STATUS. The report still runs."; \
	fi
	+$(MAKE) bench-report
	+$(MAKE) bench-cleanup

bench-config:
ifdef CONFIG_FILE
	@echo "[Harness] Using custom agent config template: $(CONFIG_FILE)"
	@cp "$(CONFIG_FILE)" "$(BENCH_WORKSPACE)/"
else
	@echo "[Harness] Writing the $(BENCH_CONFIG) agent configuration..."
	@mkdir -p "$(BENCH_WORKSPACE)"
	@echo "$$GENERATE_HARNESS_CONFIG" > "$(BENCH_WORKSPACE)/$(BENCH_CONFIG)"
endif

telemetry-settle:
	@echo "[Harness] Settling phase token counts from the host store..."
	@if [ -f "$(BENCH_WORKSPACE)/runtime-telemetry.json" ]; then \
		FILE="$(BENCH_WORKSPACE)/runtime-telemetry.json"; \
	else \
		FILE=$(BENCH_DIR)/runtime-telemetry.json; \
	fi; \
	node $(TELEMETRY_MCP_DIR)/build/settle.js "$$FILE" "$(BENCH_WORKSPACE)"

bench-report: telemetry-settle
	@echo "[Harness] Parsing compiled outputs and runtime telemetry logs..."
	python3 $(BENCH_DIR)/run_benchmark.py $(AGENT_MODEL) \
		--provider $(PROVIDER) --harness $(HARNESS) --model $(MODEL_NAME) \
		--workspace "$(BENCH_WORKSPACE)" --install-deps
	@echo "[Harness] Report generated. Use 'make bench-cleanup' to remove the workspace."

bench-cleanup:
	@echo "[Harness] Removing the transient workspace..."
	@$(call guard_workspace)
	@rm -rf "$(BENCH_WORKSPACE)"
	@rm -f $(BENCH_DIR)/runtime-telemetry.json
	@rm -f playground/$(AGENT_MODEL)/SKILL.md
	@rm -f playground/$(AGENT_MODEL)/README.md
	@rm -f playground/$(AGENT_MODEL)/guide.md
	@rm -f playground/$(AGENT_MODEL)/agent-prompt.md
	@rm -f playground/$(AGENT_MODEL)/AGENTS.md
	@rm -f playground/$(AGENT_MODEL)/opencode.json
	@rm -f playground/$(AGENT_MODEL)/opencode.jsonc
	@rm -f playground/$(AGENT_MODEL)/kilo.json
	@rm -rf playground/$(AGENT_MODEL)/go-login-crud
	@rm -rf playground/$(AGENT_MODEL)/python-http-server
	@rm -rf playground/$(AGENT_MODEL)/react-timer
	@echo "[Harness] Workspace cleaned. Report preserved at $(BENCH_DIR)/$(AGENT_MODEL)/"
	$(MAKE) bench-update

benchmark-dryrun: telemetry-build
	@echo "[Dry-Run] Building main MCP server..."
	pnpm run build
	@echo "[Dry-Run] Verifying main MCP server connectivity..."
	@pnpm tsx scripts/test-connection.ts && echo "[Dry-Run] Main MCP server OK" || echo "[Dry-Run] Main MCP server FAILED"
	@echo "[Dry-Run] Verifying telemetry MCP server connectivity..."
	@printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"lccst-dryrun","version":"3.0.0"}}}\n' | timeout 5 node playground/benchmarks/mcp-telemetry/build/index.js 2>/dev/null | python3 -c "import sys,json; d=json.loads(sys.stdin.readline()); name=d.get('result',{}).get('serverInfo',{}).get('name',''); assert name=='lccst-telemetry', f'Expected lccst-telemetry, got {name}'; print(f'OK: {name} MCP connected')" && echo "[Dry-Run] Telemetry MCP server OK" || echo "[Dry-Run] Telemetry MCP server FAILED"
	@echo "[Dry-Run] Done."

bench-update:
	@echo "[Harness] Aggregating latest benchmark reports..."
	python3 scripts/update_readme_benchmarks.py

bench-list:
	@echo "[Harness] Models that the picker offers..."
	@pnpm tsx scripts/benchmark-picker.ts --list

clean-telemetry:
	@echo "[Harness] Flushing trace telemetry caches..."
	@$(call guard_workspace)
	@rm -rf "$(BENCH_WORKSPACE)"
	@rm -f $(BENCH_DIR)/runtime-telemetry.json
	@rm -rf playground/$(AGENT_MODEL)/go-login-crud
	@rm -rf playground/$(AGENT_MODEL)/python-http-server
	@rm -rf playground/$(AGENT_MODEL)/react-timer
