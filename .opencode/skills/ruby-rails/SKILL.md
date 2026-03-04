---
name: ruby-rails
description: Ruby on Rails best practices with MVC, ActiveRecord, and testing
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce Rails MVC conventions with proper layer responsibilities
- Apply ActiveRecord patterns for models, validations, and associations
- Guide testing, authentication, authorization, and background job patterns

## When to use me
Use this when building or maintaining Ruby on Rails applications.

## Key Rules
- Use RESTful routing for all resources — follow Rails conventions
- Keep controllers thin — only HTTP concerns; move business logic to models or service objects
- Use `before_action` for shared setup; always use strong parameters for mass assignment
- ActiveRecord models own validations, associations, scopes, and callbacks
- Extract complex multi-step logic into Service Objects with `ActiveRecord::Base.transaction`
- Use scopes for reusable query logic — prefer scopes over class methods for chainability
- Use RSpec with factories (FactoryBot) for tests — never fixtures for complex data
- Use Devise for authentication; use Pundit policies for authorization
- Background jobs via ActiveJob + Sidekiq — rescue `ActiveRecord::RecordNotFound` in jobs
- API mode: use serializers for JSON responses; skip `verify_authenticity_token`
- Use eager loading (`includes`, `preload`) to prevent N+1 queries
- Callbacks should be simple — use `deliver_later` for mailers, never `deliver_now` in callbacks
- Migrations must have both `up` and `down` (or reversible `change`); add indexes on foreign keys

## Validation Commands
```bash
rspec
rubocop
brakeman
bundle audit
```
