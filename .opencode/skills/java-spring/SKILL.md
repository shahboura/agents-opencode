---
name: java-spring
description: Java Spring Boot conventions with dependency injection, validation, and testing
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: development
---

## What I do
- Enforce Spring Boot layering and dependency injection conventions
- Guide validation, error handling, and security configuration patterns
- Apply testing standards with JUnit 5 and Spring Boot Test

## When to use me
Use this when working on Java Spring Boot projects.

## Key Rules
- Constructor injection ONLY — never use `@Autowired` on fields; Spring auto-wires single-constructor beans
- Use Java `record` types (14+) for all DTOs and request/response objects — not classes with getters/setters
- Layer strictly: Controller (HTTP only) → Service (business logic) → Repository (data access)
- Use Bean Validation annotations (`@Valid`, `@NotBlank`, `@Email`, `@Size`) at the controller parameter level
- Use `@RestControllerAdvice` for global exception handling — never catch exceptions in controllers directly
- Extend `JpaRepository<T, ID>` for data access; use `@Query` for custom queries, not raw JDBC
- Return `Optional<T>` from service/repository methods for nullable results — never return null
- Use `application.yml` (not `.properties`) for configuration; externalize secrets via `${ENV_VAR}` syntax
- Configure Spring Security via `SecurityFilterChain` bean — not by extending `WebSecurityConfigurerAdapter` (deprecated)
- Use `@Validated` on controllers for method-level validation; `@Valid` on `@RequestBody` parameters
- Keep controllers thin: no business logic, only HTTP mapping and delegation to services
- Use `ResponseEntity` with explicit status codes and `@ApiResponse` annotations (Springdoc/Swagger)
- Background jobs via `@Async` or Spring `ApplicationEvent` — not raw threads
- Use a verify-fix-verify loop: run the validation commands below, fix any failures, and rerun until all checks pass

## Validation Commands
```bash
./mvnw clean compile
./mvnw test
```
