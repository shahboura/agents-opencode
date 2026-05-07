---
description: Java Spring Boot best practices with dependency injection, validation, and testing
---

# Spring Boot Instructions

## Skill-First Runtime
- For Java Spring Boot tasks, load the `java-spring` skill on demand.
- Treat this file as compact reference guidance; use the skill for detailed conventions.

## Core Guardrails
- Use constructor injection exclusively; avoid `@Autowired` field injection.
- Prefer Java records for immutable DTOs; apply Bean Validation annotations directly on components.
- Annotate controllers with `@Validated` and request parameters with `@Valid`.
- Centralize error handling via `@RestControllerAdvice` with per-exception `@ExceptionHandler` methods.
- Extend `JpaRepository<T, ID>` for data access; use Spring Data method naming for custom finders.
- Define a `SecurityFilterChain` bean; use `SessionCreationPolicy.STATELESS` for REST APIs.

## Testing & Quality
- Use JUnit 5 with `@SpringBootTest` and the Given/When/Then pattern.
- Prefer AssertJ `assertThat` for fluent assertions and `@MockBean` for external dependencies.
- Keep build and test checks green before delivery.

## Validation Commands
Examples below are defaults; prefer project scripts when they exist.

```bash
./mvnw clean compile
./mvnw test
./mvnw spring-boot:run
```
