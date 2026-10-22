# Pentest Cadence Gap Calculator (AV-11 v1.0.0)

Export: apexvector-export 1.0 · generated 2026-10-22T00:00:00.000Z
Data: Synthetic or user-entered data only. No client or engagement data.

## Inputs
- **system**: Synthetic GCC platform (captive, parent-tenant integrated)
- **releasesPerMonth**: 8
- **testsPerYear**: 1
- **shareOfReleasesChangingAttackSurface**: 0.4
- **parentRequiredTestsPerYear**: 1
- **toleratedUntestedShare**: 0.2

## Outputs
- **releasesPerYear**: 96
- **surfaceChangingReleasesPerYear**: 38.4
- **testIntervalDays**: 365
- **untestedExposureDaysPerYear**: 360.2
- **shareOfYearUncovered**: 99
- **band**: PHOTOGRAPH OF A RIVER
- **suggestedTestsPerYear**: 96
- **suggestedCadenceTier**: Continuous validation
- **parentCadenceMet**: true
- **untestedPercentAtParentCadence**: 99

## Human decisions
- **risk-acceptance**: pending — On the assumptions shown, this system runs in an untested state for about 360 days a year (99% of the year). I accept this exposure and own it until the next test.

## Assumptions
- Tests are evenly spaced across the year.
- Surface-changing releases arrive at a steady rate; a change lands at a random point after a test.
- A test stops being valid at the next release that changes the attack surface.
- Every number is entered by the user. Defaults are synthetic and illustrative.

## Limits
- Arithmetic on stated assumptions, shown on screen. It does not predict breaches.
- Not a compliance determination and not a standard. The tier ladder is ApexVector's own.
- A release that changes the attack surface is a judgment call. The share you enter drives the result.
- A test after every surface-changing release would narrow the gap further; the model reports how many that would be.
