.PHONY: help default build test tag release clean clean-telemetry bench-update bench-list bench-config bench-model benchmark-free benchmark-run benchmark-report bench-cleanup telemetry-build benchmark-dryrun test_swarm test_telemetry test_e2e test_picker test_picker_tty test_mcp test_report telemetry-settle

VERSION      ?= $(shell node -p "require('./package.json').version")
HARNESS      ?= opencode
E2E_HARNESS  ?=
AGENT_NAME   ?= $(HARNESS)
BENCH_PICK   ?= 1
# The default run must name a model that the harness offers. A harness that
# cannot resolve the pinned model starts a different model, so the run would
# measure a model that the report does not name.
PROVIDER     ?= opencode
MODEL_NAME   ?= space-bunny-free
AGENT_MODEL  := $(PROVIDER)-$(HARNESS)-$(MODEL_NAME)
BENCH_DIR    := playground/benchmarks

# Model identifier that the harness config pins, such as `kilo/stepfun/step:free`.
BENCH_MODEL_ID ?= $(PROVIDER)/$(MODEL_NAME)
# Configuration file of the running harness.
BENCH_CONFIG   ?= $(if $(filter opencode,$(HARNESS)),opencode.json,kilo.json)
# The clean room holds its own configuration directory for the harness. The
# global configuration directory of the user holds plugins, skills, and agents
# that change the prompt and the tool list, so the run must not read it.
BENCH_HARNESS_CONFIG ?= $(if $(filter opencode,$(HARNESS)),OPENCODE_CONFIG_DIR,$(if $(filter kilo,$(HARNESS)),KILO_CONFIG_DIR,HARNESS_CONFIG_DIR))
# The global configuration document of the user holds MCP servers and plugins.
# A run must not read that document, and no variable redirects it, so the run
# must not attach to the background service of the user, because that service
# read the document when it started. The flag makes the harness start a private
# server that reads only the configuration of the clean room.
BENCH_HARNESS_PRIVATE ?= $(if $(filter opencode,$(HARNESS)),--standalone,)
# The clean room sits outside the repository, so a harness can never reach a
# tracked file of the project and no ancestor instruction file can reach it.
# The path is resolved to an absolute form, because the separation check
# compares the workspace with the repository directory.
BENCH_TMP      ?= $(if $(TMPDIR),$(TMPDIR),/tmp)
BENCH_WORKSPACE := $(abspath $(BENCH_TMP))/lccst-bench-$(AGENT_MODEL)
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

# Refuse a workspace that sits inside the repository. A harness reads the
# instructions of every directory above its workspace, so a workspace inside the
# repository would send the repository `AGENTS.md` to the model under test. The
# two documents have different purposes: the repository file states the rules for
# maintaining LCCST, and the playground prompt assigns the benchmark phases.
define assert_separate_instructions
	case "$(BENCH_WORKSPACE)" in \
		"$(CURDIR)"*) \
			echo "[Harness] Refusing a workspace inside the repository."; \
			echo "[Harness] The harness reads the instructions of every parent"; \
			echo "[Harness] directory, so the repository AGENTS.md would reach"; \
			echo "[Harness] the model. Set BENCH_TMP to a directory outside the"; \
			echo "[Harness] repository."; \
			exit 1 ;; \
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
	@echo "  make test_report        Run benchmark report and README table tests"
	@echo "  make test_picker_tty    Run benchmark picker tests in a pseudo terminal"
	@echo "  make test_e2e           Run telemetry end-to-end tests on real harnesses"
	@echo "  make test_mcp           Run MCP server integration tests"
	@echo "  make tag                Create and push git tag v$(VERSION)"
	@echo "  make release            Alias for: make tag"
	@echo "  make benchmark-free     Pick a model, then run the full benchmark"
	@echo "  make bench-list         List the models that the picker offers"
	@echo "  make bench-model        Check that the harness offers the pinned model"
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
	@echo "  BENCH_PROMPT_TOKEN=$(BENCH_PROMPT_TOKEN)   Token the model must state"
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

test_report:
	python3 scripts/test-benchmark-report.py

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
	rm -f playground/benchmarks/runtime-telemetry.json

TELEMETRY_MCP_DIR := playground/benchmarks/mcp-telemetry

telemetry-build:
	@echo "[Harness] Building telemetry MCP server..."
	@cd $(TELEMETRY_MCP_DIR) && pnpm install --ignore-workspace && pnpm run build

# The token that the run puts in the instructions of the workspace. The model
# must state it, so the report can prove that the model read the instructions.
# The name of the harness file is fixed, so the token comes from the content.
BENCH_PROMPT_TOKEN ?= $(shell python3 -c "import hashlib;print(hashlib.sha256(open('playground/agent-prompt.md','rb').read()).hexdigest()[:8])")

# The instructions of the run are `playground/agent-prompt.md`. The `AGENTS.md`
# of this repository is a different document, and it never reaches a run. The
# repository is not an ancestor of the clean room, and the run points the
# configuration directory of the harness at the clean room.

# Every run writes its own telemetry file. A shared file would mix the phases of
# two runs, and a later report would sum the counts of both.
BENCH_TELEMETRY_FILE := $(BENCH_WORKSPACE)/runtime-telemetry.json

# The harness reads the telemetry file from this variable. The path sits in the
# clean room, so one run cannot reach the file of another run.
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
      "cwd": "$(BENCH_WORKSPACE)",
      "environment": {
        "LCCST_TELEMETRY_FILE": "$(BENCH_TELEMETRY_FILE)"
      },
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

# A harness that cannot resolve the pinned model starts a different model. The
# report would then name a model that never ran, so the check refuses the run
# before the clean room is built.
bench-model:
	@echo "[Harness] Checking that $(HARNESS) offers $(BENCH_MODEL_ID)..."
	@if ! command -v $(HARNESS) >/dev/null 2>&1; then \
		echo "[Harness] The command $(HARNESS) is not on the path. Install it, or set HARNESS."; \
		exit 1; \
	fi; \
	MODELS="$$(timeout 120 $(HARNESS) models 2>/dev/null | tr -d '\r')"; \
	if [ -z "$$MODELS" ]; then \
		echo "[Harness] The command '$(HARNESS) models' returned no model."; \
		echo "[Harness] The run needs the list to check the pinned model."; \
		exit 1; \
	fi; \
	if ! printf '%s\n' "$$MODELS" | grep -qxF "$(BENCH_MODEL_ID)"; then \
		echo "[Harness] The harness $(HARNESS) does not offer the model $(BENCH_MODEL_ID)."; \
		echo "[Harness] A harness that cannot resolve the model starts a different one, so"; \
		echo "[Harness] the run would measure a model that the report does not name."; \
		echo "[Harness] Run 'make bench-list' to see the models, or set BENCH_MODEL_ID."; \
		exit 1; \
	fi; \
	echo "[Harness] Model confirmed: $(BENCH_MODEL_ID)"

benchmark-run: clean-telemetry bench-model
	@echo "[Harness] Building the clean room for $(AGENT_MODEL)..."
	@$(call guard_workspace)
	@rm -rf "$(BENCH_WORKSPACE)"
	@mkdir -p "$(BENCH_WORKSPACE)/harness-config"
	@echo "[Harness] Seeding the workspace files..."
	@$(call assert_separate_instructions)
	@cp SKILL.md "$(BENCH_WORKSPACE)/SKILL.md"
	@cp playground/README.md "$(BENCH_WORKSPACE)/README.md"
	@cp playground/guide.md "$(BENCH_WORKSPACE)/guide.md"
	@cp playground/traps.md "$(BENCH_WORKSPACE)/traps.md"
	@cp playground/agent-prompt.md "$(BENCH_WORKSPACE)/agent-prompt.md"
	@cp playground/agent-prompt.md "$(BENCH_WORKSPACE)/AGENTS.md"
	@printf '%s\n' "$(BENCH_PROMPT_TOKEN)" > "$(BENCH_WORKSPACE)/prompt-token.txt"
	@echo "$(BENCH_PROMPT_TOKEN)" >> "$(BENCH_WORKSPACE)/AGENTS.md"
	+$(MAKE) --no-print-directory bench-config
	@echo "[Harness] Workspace: $(BENCH_WORKSPACE)"
	@echo "[Harness] Harness:  $(HARNESS) with $(BENCH_MODEL_ID)"
	@$(HARNESS) --version 2>&1 | head -2 | sed 's/^/[Harness] Version: /' || true
	@echo "[Harness] Run token: $(BENCH_PROMPT_TOKEN) (the model must state it)"
	@echo "[Harness] Starting the run in the foreground. Answer the harness, or type"
	@echo "[Harness] a new message to steer it. The run ends when you leave the TUI."
	@cd "$(BENCH_WORKSPACE)" && $(BENCH_HARNESS_CONFIG)="$(BENCH_WORKSPACE)/harness-config" $(HARNESS) $(BENCH_HARNESS_PRIVATE) --prompt "$(BENCH_TASK)"; \
	STATUS=$$?; \
	if [ $$STATUS -ne 0 ]; then \
		echo "[Harness] The harness left with status $$STATUS. The report still runs."; \
	fi; \
	$(MAKE) -C "$(CURDIR)" --no-print-directory bench-report; \
	$(MAKE) -C "$(CURDIR)" --no-print-directory bench-cleanup; \
	exit 0

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
	@if [ -f "$(BENCH_TELEMETRY_FILE)" ]; then \
		FILE="$(BENCH_TELEMETRY_FILE)"; \
	else \
		FILE=$(BENCH_DIR)/runtime-telemetry.json; \
	fi; \
	node $(TELEMETRY_MCP_DIR)/build/settle.js "$$FILE" "$(BENCH_WORKSPACE)"

bench-report: telemetry-settle
	@echo "[Harness] Parsing compiled outputs and runtime telemetry logs..."
	python3 $(BENCH_DIR)/run_benchmark.py $(AGENT_MODEL) \
		--provider $(PROVIDER) --harness $(HARNESS) --model $(MODEL_NAME) \
		--model-id "$(BENCH_MODEL_ID)" \
		--workspace "$(BENCH_WORKSPACE)" --install-deps
	@echo "[Harness] Report generated. Use 'make bench-cleanup' to remove the workspace."

bench-cleanup:
	@echo "[Harness] Removing the transient workspace..."
	@$(call guard_workspace)
	@rm -rf "$(BENCH_WORKSPACE)"
	@rm -f $(BENCH_TELEMETRY_FILE)
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
	@rm -f "$(BENCH_TELEMETRY_FILE)"
