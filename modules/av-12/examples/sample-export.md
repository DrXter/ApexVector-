# Human vs Agent Finding Classifier (AV-12 v1.0.0)

Export: apexvector-export 1.0 · generated 2026-10-27T00:00:00.000Z
Data: Synthetic or user-entered data only. No client or engagement data.

## Inputs
- **finding**: Approver can view other teams’ invoices by changing an ID
- **vulnerabilityClass**: Broken object-level authorisation (IDOR)
- **contextFlags**:
  - **chained**: no
  - **businessContext**: yes
  - **novel**: no
  - **verifiable**: yes
  - **breadth**: no
  - **parentSystems**: yes
  - **parentIp**: no
  - **realData**: unsure

## Outputs
- **baseAgentScore**: 60
- **baseHumanScore**: 55
- **agentScore**: 50
- **humanScore**: 75
- **lean**: -25
- **ruleVerdict**: HUMAN
- **verdict**: HUMAN
- **confidence**: LOW
- **gatesFired**: parent-scope; production-data; low-confidence

## Human decisions
- **hunter-assignment**: both — Owner: Sample owner. Overrode the HUMAN verdict: Low confidence and parent scope: keep a person in the loop

## Assumptions
- Agents are rated on repeatability, verifiability and breadth. People are rated on context, chaining and novelty.
- "Unsure" counts as half a yes and lowers confidence by 5.
- Anything touching the parent’s systems, the parent’s IP or production data keeps a person involved.

## Limits
- The scores are ApexVector defaults chosen to make the reasoning visible. They are not measured agent or human performance.
- The classifier works from the class and the flags only. It has not seen the finding itself.
- Agent capability changes quickly. Re-check the base scores each quarter.
- A verdict is advice on who should hunt for a class of finding. It does not say whether a finding exists or how severe it is.
