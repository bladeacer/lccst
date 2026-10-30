# Model Ranking

Total runs: 2

> Ranked from best to worst by composite score. Composite score weights guided robustness (25%), plain robustness (15%), pass rate (20%), FCT efficiency (20%), and ART efficiency (20%), with a token economy penalty for absolute guided token waste.

| Rank | Agent-Model | Skill Version | Harness Version | Avg Guided | Avg Plain | Pass Rate | FCT Plain | FCT Guided | FCT Overhead | ART Plain | ART Guided | ART Overhead | Composite | Verdict |
| ---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | `opencode-opencode-deepseek-v4.1-flash-free` | v4.7.0 | v2.2.1 | 93/100 | 75/100 | 3/3 | 4,229 | 4,663 | +10% | 1,221,313 | 1,154,830 | -5% | 53.5 | Strong contender |
| 2 | `opencode-opencode-mimo-v2.6-flash-free` | v4.7.0 | v2.2.1 | 91/100 | 80/100 | 3/3 | 4,497 | 5,851 | +30% | 418,134 | 1,677,668 | +301% | -12.7 | Avoid using |
