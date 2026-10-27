### LCCST 4.5.0

Date: _2026-10-27_

The audit of the benchmark methodology found two dead gates, one unguarded
test verdict, and several accuracy gaps. Every gate of the README table is
now live, and every measurement states its limits.

## Correctness

### The Contamination Gate Reads the Emitted Note

The gate parsed the contamination note of the report with a pattern that
does not match the text that the scanner emits. The parser therefore held
`contaminated = no` for every report, and a run with a copied implementation
could enter the README table. The pattern now matches the emitted text, and
new tests parse a real report for the state.

### The Impossible-Count Flag Fires

The settle step flagged a phase whose counts exceed the session total, but
the session total was the sum of the phases it compares against, so the flag
could never fire, and the flag never reached the telemetry file. The settle
step now compares every settled phase with an independent total from every
session of the workspace, it writes the flagged phases into the telemetry
file, and the report names them. The README table rejects a report that
holds a flagged phase.

### A Go Variant With Zero Tests Is an Error

`go test ./tests/` exits with 0 and prints `[no test files]` when the
package holds no test file, so a variant with zero coverage scored as
`PASSED`. The scanner now names that output an error, and it still scores a
real result when one package in the workspace runs and another has no test.

### The Run Token Must Be Stated in Every Phase

The report verified the prompt when one settled phase recorded the token,
so evidence of one session covered the other sessions. The report now
verifies the prompt only when every settled phase states the token. The
settle step states the same rule in its message.

### The Generator Reads Its Paths from the Script

`BENCH_DIR`, `README_PATH`, and `RANKING_PATH` were relative to the working
directory. A call from another directory found no reports and overwrote the
README table with no findings. The paths now resolve from the script file.

### A Toolchain Drift Rejects the Run

The report warned about a toolchain drift, but the README table accepted the
report anyway. The table now rejects a report whose machine does not match
the declared toolchain, because a drift changes every score.

## Consistency

### The Score Is Named a Proxy

The report now states under the robustness table that the score is a
text-level proxy, not a proof of design quality, and that the test run is
the only behavioural proof in the report.

### Report Text Cleanup

The dead `TOP_N` constant is gone, and the docstring says top three. The
delta cells sign negative values correctly. The harness-note condition
names its blocks with brackets. The toolchain comparison reads whole dotted
components, so `3.13.110` no longer matches a declared `3.13.11`.

## Version

Bumped from 4.4.0 to 4.5.0.
