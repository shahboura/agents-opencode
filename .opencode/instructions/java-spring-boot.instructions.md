---
description: Java Spring Boot best practices with dependency injection, validation, and testing
---

# Java Spring Boot Instructions

## Architecture Principles

**Follow Spring Boot conventions:**
- Use constructor injection over field injection
- Prefer immutable DTOs with records (Java 14+)
- Apply proper layering (Controller → Service → Repository)
- Use Optional for nullable return values

## Dependency Injection

**Constructor injection only.** Avoid `@Autowired` field injection — it hides dependencies and complicates testing. Declare dependencies as `private final` fields initialized via the constructor.

## Entity Design

Use JPA annotations on entity classes: `@Entity`, `@Table`, `@Id`, `@GeneratedValue(strategy = GenerationType.IDENTITY)`. Mark timestamps with `@CreationTimestamp` / `@UpdateTimestamp`. Constrain columns with `@Column(nullable = false, unique = true)`.

## DTOs and Records

Prefer Java records for immutable DTOs (Java 14+). Apply Bean Validation annotations (`@NotBlank`, `@Email`, `@Size`) directly on record components. Create dedicated request/response record types per operation.

## Validation

Annotate controllers with `@Validated` and request bodies with `@Valid`. Validate path/query parameters with `@Min`, `@Positive`, etc. Return proper `ResponseEntity` with appropriate status codes (`created`, `ok`, `notFound`).

## Error Handling

Use `@RestControllerAdvice` with `@ExceptionHandler` methods per exception type. Return a consistent `ErrorResponse` structure. For validation failures, extract field errors from `BindingResult` via `getFieldErrors()`.

## Testing

Use `@SpringBootTest` with JUnit 5. Follow Given/When/Then pattern. Use AssertJ's `assertThat` for fluent assertions and `assertThatThrownBy` for exception verification. Use `@MockBean` for external dependencies.

## Repository Pattern

Extend `JpaRepository<T, ID>` for standard CRUD. Add custom finders following Spring Data method naming. Use `@Query` with JPQL for complex queries and `@Modifying` for update/delete operations. Pass `@Param` annotations for named parameters.

## Configuration

Use `application.yml` with structured profiles. Reference environment variables via `${VAR_NAME}`. In production: `ddl-auto: validate`, `show-sql: false`. Add logging level overrides per package.

## Security

Define a `SecurityFilterChain` bean. For stateless APIs use `SessionCreationPolicy.STATELESS`. Add JWT filter before `UsernamePasswordAuthenticationFilter`. Use `@PreAuthorize` for method-level fine-grained authorization.

## Best Practices

### Code Organization
- Keep controllers thin — only HTTP concerns
- Put business logic in service layer
- Use repositories for data access only
- Create custom exceptions for business errors

### Performance
- Use pagination for large result sets
- Implement caching where appropriate
- Use lazy loading judiciously
- Monitor database query performance

### Maintainability
- Write descriptive method names
- Add JavaDoc for public APIs
- Keep methods small and focused

## Validation Commands

```bash
# Build
./mvnw clean compile

# Test
./mvnw test

# Run
./mvnw spring-boot:run

# Check dependencies
./mvnw dependency:check

# Run with profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

For detailed examples and extended guidance, see [java-spring-boot-reference.instructions.md](java-spring-boot-reference.instructions.md).
