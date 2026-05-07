---
name: career-content
description: Resume writing, LinkedIn profile optimization, cover letters, and professional bio creation. Use for career content involving ATS optimization, STAR method, action verbs, and personal branding.
license: MIT
compatibility: opencode
metadata:
  author: shahboura
  version: "2.0.0"
  audience: professionals
---

# Career Content Skill

## When to Activate

Activate this skill when:
- Writing or updating a resume
- Optimizing a LinkedIn profile (headline, summary, experience)
- Drafting cover letters or professional bios
- Preparing career narratives for promotions or job applications
- Improving resume phrasing with action verbs and metrics
- Checking ATS (Applicant Tracking System) compatibility

## Which Agent to Use

| Agent | Best For | Style |
|-------|----------|-------|
| **@em-advisor** | Career strategy — what to highlight, framing achievements, positioning for promotion | Strategic framing, achievement identification |
| **@blogger** | Copywriting — punchy bullets, headline formulas, summary phrasing | Fast iteration, compelling language |

**Recommended:** Use em-advisor to identify what to showcase, then blogger to polish the language.

## Resume Rules

### Structure
- 1 page for <10 years experience, 2 pages for 10+
- Sections: Contact → Summary → Skills → Experience → Education → (Optional: Projects, Certifications)
- Reverse chronological within each section
- Save as `resume-<name>.md` — deliver as markdown for easy editing

### Bullet Formula (STAR + Metrics)
Every experience bullet should follow: **Action Verb → Task → Result (with metric)**

```
✅ Built a real-time dashboard using React and WebSockets, reducing incident response time by 60%
❌ Worked on a dashboard project
```

### ATS Optimization
- Use keywords from the target job description
- Avoid tables, columns, images, and headers/footers
- Use standard section names (Experience, not "Where I've Worked")
- Include both acronyms and full terms: "AWS (Amazon Web Services)"
- Save final version as plain text to verify ATS parseability

### Action Verbs
- **Leadership:** Led, Directed, Orchestrated, Spearheaded, Championed
- **Technical:** Architected, Engineered, Developed, Automated, Optimized
- **Impact:** Increased, Reduced, Accelerated, Streamlined, Transformed
- **Collaboration:** Partnered, Facilitated, Coordinated, Aligned

Avoid weak verbs: "Worked on," "Helped with," "Was responsible for," "Participated in"

## LinkedIn Rules

### Headline Formula
```
[Role] at [Company] | [Specialty 1] | [Specialty 2] | [Value Statement]
```
Keep under 120 characters. Include keywords recruiters search for.

### Summary Section
- 3-5 short paragraphs
- Paragraph 1: Who you are and what you do (present tense)
- Paragraph 2: Key achievements (past tense, metrics)
- Paragraph 3: What you're looking for or passionate about
- Include 3-5 core skills as hashtags

### Experience Section
- Same STAR + metrics formula as resume
- 3-5 bullets per role
- Add media/links to projects when relevant

## Cover Letters

- 3-4 paragraphs, under 400 words
- Paragraph 1: Role you're applying for + why this company
- Paragraph 2: Your most relevant achievement (specific, metric-driven)
- Paragraph 3: Why you're a fit — connect your skills to their needs
- Paragraph 4: Call to action + contact info
- Research the company before writing; reference specific projects or values

## Writing Conventions

- Use active voice, present tense for current role, past tense for previous
- Numbers under 10: spell out. 10+: use digits. Percentages: "40%" not "40 percent"
- No personal pronouns in resume ("I," "me," "my") — implied subject
- Third person or first person OK for LinkedIn summary; be consistent
- File naming: `resume-<name>.md`, `cover-letter-<company>.md`, `linkedin-profile.md`

## Quick Reference

For detailed before/after examples and templates, see [references/examples.md](references/examples.md).
