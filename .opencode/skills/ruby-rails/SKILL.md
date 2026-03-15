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
- Use the project's test runner and fixture strategy consistently (for example RSpec + FactoryBot or Rails test + fixtures)
- Use established authN/authZ libraries (for example Devise/Sorcery/Auth0 SDK and Pundit/CanCanCan) based on project needs
- Use ActiveJob with an appropriate backend (for example Sidekiq, Solid Queue); handle missing records explicitly
- In API-only token-auth setups, CSRF is often unnecessary; do not disable CSRF globally for cookie/session flows
- Use eager loading (`includes`, `preload`) to prevent N+1 queries
- Callbacks should be simple — use `deliver_later` for mailers, never `deliver_now` in callbacks
- Migrations must have both `up` and `down` (or reversible `change`); add indexes on foreign keys
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Naming Conventions
- `snake_case` for files/methods/variables
- `CamelCase` for classes/modules
- Service objects should use verb-oriented names (`CreateInvoice`, `RegisterUser`)
- Scope names should be intention-revealing and chain-safe

## Common Pitfalls
- Fat controllers with hidden business logic
- N+1 queries due to missing eager loading
- Authorization checks scattered across controllers/views
- Long-running work executed inline instead of background jobs

## Example Patterns
```ruby
class RegisterUser
  def initialize(params)
    @params = params
  end

  def call
    User.transaction do
      user = User.create!(@params)
      UserProfile.create!(user:, onboarding_state: "pending")
      user
    end
  end
end
```

## Validation Commands
Prefer project scripts when present; use defaults below otherwise.

```bash
rails test  # or project-configured test runner (e.g., rspec)
rubocop
brakeman
bundle audit
```
