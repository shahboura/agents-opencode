---
description: Java Spring Boot best practices with dependency injection, validation, and testing
applyTo: '**/*.{java,kt}'
---

# Java Spring Boot Instructions

## Architecture Principles

**Follow Spring Boot conventions:**
- Use constructor injection over field injection
- Prefer immutable DTOs with records (Java 14+)
- Apply proper layering (Controller → Service → Repository)
- Use Optional for nullable return values

## Dependency Injection

**Constructor injection only:**
```java
@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }
}
```

**Avoid field injection:**
```java
// ❌ Bad
@Autowired
private UserRepository userRepository;

// ✅ Good - Constructor injection
```

## Entity Design

**Use JPA annotations properly:**
```java
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @CreationTimestamp
    private LocalDateTime createdAt;

    // Constructors, getters, setters
}
```

## DTOs and Records

**Use records for immutable DTOs:**
```java
// Java 14+ record
public record UserDto(
    Long id,
    String email,
    String name,
    LocalDateTime createdAt
) {
    // Automatic constructor, getters, equals, hashCode, toString
}

// For complex DTOs
public record CreateUserRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8) String password,
    @NotBlank String name
) {}
```

## Validation

**Use Bean Validation:**
```java
@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    @PostMapping
    public ResponseEntity<UserDto> createUser(@Valid @RequestBody CreateUserRequest request) {
        User user = userService.createUser(request);
        return ResponseEntity.created(uri).body(userMapper.toDto(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable @Min(1) Long id) {
        return userService.findById(id)
            .map(userMapper::toDto)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
```

## Error Handling

**Use ControllerAdvice for global error handling:**
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("User not found", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                FieldError::getDefaultMessage
            ));

        return ResponseEntity.badRequest()
            .body(new ErrorResponse("Validation failed", errors));
    }
}
```

## Testing

**Use Spring Boot Test with JUnit 5:**
```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void shouldCreateUserSuccessfully() {
        // Given
        CreateUserRequest request = new CreateUserRequest(
            "test@example.com", "password123", "Test User"
        );

        // When
        User user = userService.createUser(request);

        // Then
        assertThat(user.getId()).isNotNull();
        assertThat(user.getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void shouldThrowExceptionWhenUserNotFound() {
        // When & Then
        assertThatThrownBy(() -> userService.findById(999L))
            .isInstanceOf(UserNotFoundException.class)
            .hasMessage("User not found with id: 999");
    }
}
```

## Repository Pattern

**Use Spring Data JPA:**
```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.createdAt > :since")
    List<User> findRecentUsers(@Param("since") LocalDateTime since);

    @Modifying
    @Query("UPDATE User u SET u.lastLoginAt = :now WHERE u.id = :id")
    int updateLastLogin(@Param("id") Long id, @Param("now") LocalDateTime now);
}
```

## Configuration

**Use application.yml for configuration:**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/myapp
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}

  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false

logging:
  level:
    com.example.myapp: DEBUG
    org.springframework.security: TRACE
```

## Security

**Use Spring Security properly:**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable()) // For APIs, consider enabling
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

## Best Practices

### Code Organization
- Keep controllers thin (only HTTP concerns)
- Put business logic in services
- Use repositories for data access
- Create custom exceptions for business errors

### Performance
- Use pagination for large result sets
- Implement caching where appropriate
- Use lazy loading judiciously
- Monitor database query performance

### Maintainability
- Write descriptive method names
- Add JavaDoc for public APIs
- Use meaningful variable names
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