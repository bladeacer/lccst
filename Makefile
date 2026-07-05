.PHONY: help default build test tag release clean clean-telemetry bench-update benchmark-free bench-report bench-cleanup

VERSION      ?= $(shell node -p "require('./package.json').version")
AGENT_NAME   ?= opencode
MODEL_NAME   ?= deepseek-v4-flash-free
AGENT_MODEL  := $(AGENT_NAME)-$(MODEL_NAME)
BENCH_DIR    := playground/benchmarks
CONFIG_FILE  ?=

default: help

help:
	@echo "LCCST (Locust) - Deterministic Workspace Gatekeeper"
	@echo ""
	@echo "Usage:"
	@echo "  make build              Compile TypeScript -> dist/index.js"
	@echo "  make test               Run all tests (unit + integration)"
	@echo "  make test_swarm         Run swarm library unit tests"
	@echo "  make test_mcp           Run MCP server integration tests"
	@echo "  make tag                Create and push git tag v$(VERSION)"
	@echo "  make release            Alias for: make tag"
	@echo "  make benchmark-free     Run full benchmark lifecycle"
	@echo "  make bench-report       Parse telemetry & generate report (no cleanup)"
	@echo "  make bench-cleanup      Remove transient workspace files after report"
	@echo "  make clean              Remove dist/ directory"
	@echo "  make help               Show this message"
	@echo ""
	@echo "Variables:"
	@echo "  VERSION=$(VERSION)      AGENT_NAME=$(AGENT_NAME)  MODEL_NAME=$(MODEL_NAME)"
	@echo "  CONFIG_FILE=$(CONFIG_FILE)   Path to custom agent config template"
	@echo ""
	@echo "Example:"
	@echo "  make tag VERSION=3.1.0"
	@echo "  make benchmark-free CONFIG_FILE=./claude.jsonc"

build:
	pnpm run build

test:
	pnpm run test

test_swarm:
	tsx scripts/test-swarm-unit.ts

test_mcp:
	pnpm run build && tsx scripts/test-connection.ts

tag:
	@echo "[Release] Creating and pushing git tag v$(VERSION)..."
	git tag "v$(VERSION)" -m "$(VERSION)"
	git push origin "v$(VERSION)"
	@echo "[Release] Tag pushed. GitHub Actions will draft the release."
	@echo "[Release] See https://github.com/bladeacer/lccst/actions"

release: tag

clean:
	rm -rf dist

define GENERATE_OPECODE_CONFIG
{
  "mcp": {
    "lccst-telemetry": {
      "type": "local",
      "command": ["node", "${workspaceFolder}/playground/benchmarks/mcp-telemetry/build/index.js"],
      "enabled": true
    }
  }
}
endef
export GENERATE_OPECODE_CONFIG

benchmark-free: clean-telemetry
	@echo "[Harness] Structuring isolation clean-room for $(AGENT_MODEL)..."
	@mkdir -p playground/$(AGENT_MODEL)
	@echo "[Harness] Seeding workspace configurations into sandbox scope..."
	@cp SKILL.md playground/$(AGENT_MODEL)/SKILL.md
	@cp playground/README.md playground/$(AGENT_MODEL)/README.md
	@cp playground/guide.md playground/$(AGENT_MODEL)/guide.md
ifdef CONFIG_FILE
	@echo "[Harness] Using custom agent config template: $(CONFIG_FILE)"
	@cp "$(CONFIG_FILE)" playground/$(AGENT_MODEL)/
else
	@echo "[Harness] Generating default opencode.jsonc agent configuration..."
	@echo "$$GENERATE_OPECODE_CONFIG" > playground/$(AGENT_MODEL)/opencode.jsonc
endif
	@echo "[Harness] Starting interactive agent terminal session..."
	$(AGENT_NAME) playground/$(AGENT_MODEL)
	+$(MAKE) bench-report
	+$(MAKE) bench-cleanup

bench-report:
	@echo "[Harness] Parsing compiled outputs and runtime telemetry logs..."
	python3 $(BENCH_DIR)/run_benchmark.py $(AGENT_MODEL) --install-deps
	@echo "[Harness] Report generated. Use 'make bench-cleanup' to remove workspace files."

bench-cleanup:
	@echo "[Harness] Removing transient workspace files..."
	@rm -f playground/$(AGENT_MODEL)/SKILL.md
	@rm -f playground/$(AGENT_MODEL)/README.md
	@rm -f playground/$(AGENT_MODEL)/guide.md
	@rm -f playground/$(AGENT_MODEL)/opencode.jsonc
	@rm -rf playground/$(AGENT_MODEL)/go-login-crud
	@rm -rf playground/$(AGENT_MODEL)/python-http-server
	@rm -rf playground/$(AGENT_MODEL)/react-timer
	@echo "[Harness] Workspace cleaned. Report preserved at $(BENCH_DIR)/$(AGENT_MODEL)/"
	$(MAKE) bench-update

bench-update:
	@echo "[Harness] Aggregating latest benchmark reports..."
	python3 scripts/update_readme_benchmarks.py

clean-telemetry:
	@echo "[Harness] Flushing trace telemetry caches..."
	@rm -f playground/$(AGENT_MODEL)/opencode.jsonc
	@rm -f playground/$(AGENT_MODEL)/playground/benchmarks/runtime-telemetry.json
	@rm -f playground/$(AGENT_MODEL)/runtime-telemetry.json
	@rm -f playground/benchmarks/runtime-telemetry.json
	@rm -rf playground/$(AGENT_MODEL)/go-login-crud
	@rm -rf playground/$(AGENT_MODEL)/python-http-server
	@rm -rf playground/$(AGENT_MODEL)/react-timer
