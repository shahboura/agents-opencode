# General Privacy Patterns (Best Practices)

## Data Minimization
- [ ] Collect only data that is strictly necessary for the defined purpose
- [ ] Avoid collecting sensitive data unless absolutely required
- [ ] Default all optional fields to "not collected"
- [ ] Regularly audit collected data fields and remove unused ones

## Purpose Limitation
- [ ] Define and document the specific purpose for each data collection point
- [ ] Do not repurpose data without new consent or lawful basis
- [ ] Separate consent for different processing purposes (no bundling)
- [ ] Review purposes periodically and update privacy notices

## Retention Limits
- [ ] Define retention periods per data category (e.g., logs: 90 days, analytics: 26 months)
- [ ] Implement automated data purging based on retention schedules
- [ ] Anonymize data rather than deleting where possible
- [ ] Document retention rationale and review annually

## Security Baseline
- [ ] Encryption at rest (AES-256 or equivalent) for all stored personal data
- [ ] Encryption in transit (TLS 1.2+) for all data transmission
- [ ] Access controls: least privilege, role-based access, MFA for sensitive systems
- [ ] Audit logging: record who accessed what data and when
- [ ] Regular penetration testing and vulnerability scanning
- [ ] Incident response plan with defined breach notification procedures

## Consent Management
- [ ] Granular consent options (not all-or-nothing)
- [ ] Clear, plain-language consent requests (no legalese)
- [ ] Easy withdrawal mechanism (as easy as giving consent)
- [ ] Consent records maintained with timestamps and scope
- [ ] Cookie consent banners that respect "Do Not Track" / GPC signals

## Cross-Border Data Transfers
- [ ] Identify all jurisdictions where data is stored or processed
- [ ] Document transfer mechanisms (SCCs, BCRs, adequacy decisions)
- [ ] Conduct Transfer Impact Assessments (TIA) for high-risk transfers
- [ ] Maintain transfer records for regulatory inspection

## Vendor / Third-Party Management
- [ ] Inventory all third parties that receive or process personal data
- [ ] DPAs signed with all data processors
- [ ] Regular vendor security assessments and compliance reviews
- [ ] Data processing limited to what is specified in the DPA
