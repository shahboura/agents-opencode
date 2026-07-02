# Career Content Reference

> Part of the `blogger` skill. Use for resume writing, LinkedIn optimization,
> cover letters, and professional bios.

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

## Pre-Writing: Match Skills to the Job

Before writing anything:
1. Extract 5-10 keywords and requirements from the target job description
2. Map your top achievements to each requirement
3. Use this mapping to decide which bullets to write — every bullet should trace back to a requirement
4. Prioritize requirements that appear in the first half of the job description (most important)

## Resume Rules

### Structure
- 1 page for <10 years experience, 2 pages for 10+
- Sections: Contact → Summary → Skills → Experience → Education → (Optional: Projects, Certifications)
- Reverse chronological within each section
- Save as `resume-<name>.md` — deliver as markdown for easy editing

### Resume Summary
Write 2-3 sentences following: `[Role] with [X years] in [industry]. Skilled in [skill 1], [skill 2], and [skill 3], with a track record of [measurable achievement]. Seeking to apply expertise to [goal].`
- Skip if <3 years experience — use an objective statement instead
- Customize the last sentence for each application

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

Modern ATS platforms (Greenhouse, Lever, Workday, Ashby) handle basic tables and columns better than older systems, but plain-text formatting remains the safest choice for broad compatibility.

### Action Verbs
- **Leadership:** Led, Directed, Orchestrated, Spearheaded, Championed
- **Technical:** Architected, Engineered, Developed, Automated, Optimized
- **Impact:** Increased, Reduced, Accelerated, Streamlined, Transformed
- **Collaboration:** Partnered, Facilitated, Coordinated, Aligned

Avoid weak verbs: "Worked on," "Helped with," "Was responsible for," "Participated in"

### Quantifying Impact Without Exact Metrics
When you don't have precise numbers, use reasonable estimates with approximate markers:
- Time savings: "reduced deployment time by ~70%" or "cut review cycles from days to hours"
- Volume/scale: "processed ~10K requests daily" or "supported 3x growth without adding headcount"
- Before/after comparisons: "improved test coverage from ~40% to 85%"
- Dollar impact via proxies: "saved ~$50K/year by consolidating 3 vendor tools into 1"
- Always prefer concrete ranges over vague adjectives ("improved" → "improved by 30-40%")

## LinkedIn Rules

### Headline Formula
```
[Role] at [Company] | [Specialty 1] | [Specialty 2] | [Value Statement]
```
Keep under 220 characters (LinkedIn's current limit). Include keywords recruiters search for.

### Alternative Headline Strategies
Beyond the pipeline formula, consider:
- **Mission-driven:** "Helping startups scale their engineering teams from seed to Series B"
- **Personality-forward:** "Engineer by training, product thinker by instinct. Ask me about distributed systems."
- **Thought-leadership:** "Writing about engineering culture, hiring, and why monoliths aren't dead"
- Choose a style that matches your industry: pipeline for corporate/enterprise, mission-driven for startups, personality for creative roles

### Profile Visuals
- **Banner/background photo**: Use a clean, professional image that reflects your industry (conference talk, workspace, abstract tech graphic). Avoid generic stock photos, personal/family photos, and overly busy images. Recommended dimensions: 1584 x 396 pixels.
- **Profile photo**: Headshot with plain background, well-lit, looking at the camera. You should occupy ~60% of the frame.

### Summary Section
- 3-5 short paragraphs
- Paragraph 1: Who you are and what you do (present tense)
- Paragraph 2: Key achievements (past tense, metrics)
- Paragraph 3: What you're looking for or passionate about
- Include 3-5 core skills as hashtags

### Summary Style Tips
- Write how you speak — read it aloud; if it sounds stiff, rewrite it
- Hook readers in the first sentence with a bold claim or personal angle
- Cut jargon and buzzwords ("synergy," "passionate," "results-driven")
- Add one personal element (hobby, side project, or non-work interest)
- Use white space — short paragraphs, 1-2 sentences each
- Avoid opening with "I am a..." — lead with impact instead

### Experience Section
- Same STAR + metrics formula as resume
- 3-5 bullets per role
- Add media/links to projects when relevant

### Skills Section
- Add all relevant skills (LinkedIn allows up to 50)
- **Pin your top 3** skills — these appear first and carry the most weight in recruiter searches
- Reorder remaining skills by relevance to your target role, not alphabetically
- Endorsements from colleagues add credibility; aim for 5+ endorsements on your top 3 pinned skills

### Hard Skills Only
Your Skills section should contain only hard/technical skills. Soft skills belong in experience bullets:
- "Communication" → Demonstrate via "Presented quarterly roadmap to C-suite and 200+ engineers"
- "Leadership" → Demonstrate via "Led a team of 5 through a platform migration"
- "Problem-solving" → Demonstrate via "Reduced P95 latency by 60% through query optimization"

## Cover Letters

> **Check relevance:** Many tech companies and startups no longer require cover letters. Before writing one, verify the role explicitly asks for it. If optional, a brief 150-200 word letter can still differentiate you — 94% of hiring managers say cover letters influence decisions (Resume Genius, 2026).

- 3-4 paragraphs, under 400 words
- Paragraph 1: Role you're applying for + why this company
- Paragraph 2: Your most relevant achievement (specific, metric-driven)
- Paragraph 3: Why you're a fit — connect your skills to their needs
- Paragraph 4: Call to action + contact info
- Research the company before writing; reference specific projects or values

### Avoiding AI Detection
Cover letters are increasingly screened for generic AI-generated language. To sound authentic:
- Reference a specific company project, blog post, or product launch — something a template couldn't know
- Vary sentence structure; avoid the "I am writing to apply for X at Y because Z" monotone
- Add one sentence that only you could write (a personal connection to the company's mission or domain)

## Writing Conventions

- Use active voice, present tense for current role, past tense for previous
- Numbers under 10: spell out. 10+: use digits. Percentages: "40%" not "40 percent"
- No personal pronouns in resume ("I," "me," "my") — implied subject
- Third person or first person OK for LinkedIn summary; be consistent
- **Date formatting:** Use MM/YYYY for all dates (e.g., "06/2021 — Present"). Avoid seasons ("Summer 2021"), day-level precision ("06/15/2021"), or abbreviations ("Jun. 2021"). Use "Present" (not "Current") for ongoing roles.
- File naming: `resume-<name>.md`, `cover-letter-<company>.md`, `linkedin-profile.md`

### Proofreading Checklist
Before delivering any career document:
- [ ] Run spellcheck and grammar check (Grammarly, LanguageTool, or built-in)
- [ ] Read the entire document aloud — catches awkward phrasing and run-on sentences
- [ ] Verify all dates, job titles, and company names are accurate
- [ ] Confirm bullet formatting is consistent (same punctuation style, parallel structure)
- [ ] Check that every bullet has an action verb and (where possible) a metric
- [ ] Have another person review it — fresh eyes catch what you'll miss
- [ ] Paste the plain-text version into a text editor to verify ATS parseability

### File Format Recommendations
- **Deliver as `.md`** (Markdown) for easy editing, collaboration, and version control
- **Export final as `.pdf`** for submission — PDF preserves formatting across devices
- Avoid `.docx` unless the employer specifically requires it; Word formatting can shift between versions
- Name files professionally: `Jane-Smith-Resume-2026.pdf`, not `resume_final_v3.pdf`

## Quick Reference

For detailed before/after examples and templates, see [career-examples/examples.md](career-examples/examples.md).
