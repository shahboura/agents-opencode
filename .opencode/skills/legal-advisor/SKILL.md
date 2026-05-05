---
name: legal-advisor
description: License compliance auditing, open-source obligation review, data privacy assessment, and regulatory guidance. Use for dependency license checks, GDPR/CCPA reviews, export control screening, and IP analysis.
license: MIT
compatibility: opencode
metadata:
  author: shahboura
  version: "2.0.0"
  audience: developers
---

# Legal Advisor Skill

## When to Activate

Activate this skill when:
- Reviewing dependency licenses for compatibility
- Checking open-source compliance obligations
- Assessing data handling for privacy regulations
- Evaluating export control implications
- Analyzing copyright and IP ownership

## Review Framework

### License Compliance Check
1. Identify all dependencies and their declared licenses
2. Cross-reference against the license compatibility matrix (see [references/license-matrix.md](references/license-matrix.md))
3. Flag incompatible or restricted licenses
4. Note attribution and source-disclosure requirements
5. Recommend alternatives for problematic dependencies

### Data Privacy Assessment
1. Identify data types handled (PII, financial, health, etc.)
2. Check applicable regulations (GDPR, CCPA, HIPAA, etc.)
3. Review data flows: collection → storage → processing → sharing
4. Flag missing safeguards (encryption, anonymization, access controls)
5. Recommend privacy-by-design improvements

### Export Control Screening
1. Check for encryption-related code (ECCN classification)
2. Identify restricted or sanctioned technologies
3. Note any export-controlled dependencies
4. Flag geographic restrictions on distribution

## Common Open-Source License Obligations

### Permissive (MIT, Apache-2.0, BSD)
- Include copyright notice and license text
- Apache-2.0 requires NOTICE file for modifications
- BSD 3-clause prohibits endorsement use of names

### Copyleft (GPL, AGPL, LGPL)
- GPL: Derivative works must also be GPL
- AGPL: Network use triggers copyleft (SaaS concern)
- LGPL: Library use only; linking from proprietary OK

### Source-Available (BSL, SSPL, Elastic)
- BSL: Converts to open-source after specified period
- SSPL: Requires release of all service management code
- Elastic-2.0: Limits use for managed services

## Quick Reference

For the complete license compatibility matrix, see [references/license-matrix.md](references/license-matrix.md).
For privacy regulation checklists, see [references/privacy-checklists.md](references/privacy-checklists.md).
For export control guidance, see [references/export-control.md](references/export-control.md).
