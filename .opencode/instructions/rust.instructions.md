---
description: Rust best practices with ownership, error handling, and performance
applyTo: '**/*.rs'
---

# Rust Instructions

## Ownership & Borrowing

**Follow ownership principles:**
- Each value has a single owner
- Borrowing allows temporary access
- Lifetimes ensure memory safety
- No garbage collector - explicit memory management

**Ownership examples:**
```rust
// ✅ Ownership transfer
fn take_ownership(s: String) {
    println!("{}", s); // s is moved here
} // s is dropped here

// ✅ Borrowing
fn borrow_string(s: &String) {
    println!("{}", s); // s is borrowed, not moved
} // s is still valid here

// ✅ Mutable borrowing
fn modify_string(s: &mut String) {
    s.push_str(" world");
}
```

## Error Handling

**Use Result and Option instead of panics:**
```rust
// ✅ Result for recoverable errors
fn read_file(path: &str) -> Result<String, std::io::Error> {
    std::fs::read_to_string(path)
}

// ✅ Option for nullable values
fn find_user(id: u32) -> Option<User> {
    users.iter().find(|u| u.id == id).cloned()
}

// ✅ Error propagation with ?
fn process_file(path: &str) -> Result<String, std::io::Error> {
    let content = std::fs::read_to_string(path)?;
    let processed = process_content(&content)?;
    Ok(processed)
}
```

**Avoid unwrap() in production:**
```rust
// ❌ Bad - will panic
let user = find_user(123).unwrap();

// ✅ Good - handle the error
let user = find_user(123).ok_or("User not found")?;

// ✅ Or provide default
let user = find_user(123).unwrap_or_default();
```

## Structs & Enums

**Use structs for data, enums for variants:**
```rust
// ✅ Struct with named fields
#[derive(Debug, Clone)]
struct User {
    id: u32,
    name: String,
    email: String,
    active: bool,
}

// ✅ Builder pattern for complex construction
impl User {
    fn new(id: u32, name: String, email: String) -> Self {
        Self {
            id,
            name,
            email,
            active: true,
        }
    }
}

// ✅ Enum for different types
#[derive(Debug)]
enum PaymentMethod {
    CreditCard { number: String, expiry: String },
    BankTransfer { account: String, routing: String },
    PayPal { email: String },
}
```

## Traits & Generics

**Use traits for polymorphism:**
```rust
// ✅ Trait definition
trait PaymentProcessor {
    fn process(&self, amount: f64) -> Result<(), String>;
}

// ✅ Generic implementation
impl<T: PaymentProcessor> PaymentService<T> {
    fn charge(&self, processor: &T, amount: f64) -> Result<(), String> {
        processor.process(amount)
    }
}

// ✅ Common traits
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct Order {
    id: u32,
    amount: f64,
}

impl Display for Order {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Order {}: ${:.2}", self.id, self.amount)
    }
}
```

## Async Programming

**Use async/await with tokio:**
```rust
use tokio::time::{sleep, Duration};

async fn fetch_user(id: u32) -> Result<User, reqwest::Error> {
    let url = format!("https://api.example.com/users/{}", id);
    let response = reqwest::get(&url).await?;
    let user = response.json::<User>().await?;
    Ok(user)
}

async fn process_users() -> Result<(), Box<dyn std::error::Error>> {
    let futures = (1..=10).map(|id| fetch_user(id));
    let results = futures_util::future::join_all(futures).await;

    for result in results {
        match result {
            Ok(user) => println!("Processed user: {}", user.name),
            Err(e) => eprintln!("Error fetching user: {}", e),
        }
    }

    Ok(())
}
```

## Testing

**Use built-in testing framework:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_creation() {
        let user = User::new(1, "John".to_string(), "john@example.com".to_string());
        assert_eq!(user.id, 1);
        assert_eq!(user.name, "John");
        assert!(user.active);
    }

    #[test]
    fn test_find_user_exists() {
        let users = vec![
            User::new(1, "John".to_string(), "john@example.com".to_string()),
            User::new(2, "Jane".to_string(), "jane@example.com".to_string()),
        ];

        let result = find_user(1);
        assert!(result.is_some());
        assert_eq!(result.unwrap().name, "John");
    }

    #[test]
    fn test_find_user_not_exists() {
        let users: Vec<User> = vec![];
        let result = find_user(999);
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_async_operation() {
        let result = async_operation().await;
        assert!(result.is_ok());
    }
}
```

## Documentation

**Use rustdoc for documentation:**
```rust
/// Represents a user in the system.
///
/// # Examples
///
/// ```
/// let user = User::new(1, "John".to_string(), "john@example.com".to_string());
/// assert_eq!(user.id, 1);
/// ```
#[derive(Debug, Clone)]
pub struct User {
    /// Unique identifier for the user
    pub id: u32,
    /// User's full name
    pub name: String,
    /// User's email address
    pub email: String,
    /// Whether the user account is active
    pub active: bool,
}
```

## Performance

**Zero-cost abstractions:**
```rust
// ✅ Iterators are lazy and composable
let sum: i32 = (1..=100)
    .filter(|x| x % 2 == 0)
    .map(|x| x * x)
    .sum();

// ✅ Pattern matching is optimized
fn process_value(value: Option<i32>) -> i32 {
    match value {
        Some(x) if x > 0 => x * 2,
        Some(_) => 0,
        None => -1,
    }
}
```

## Cargo & Dependencies

**Organize Cargo.toml properly:**
```toml
[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
reqwest = { version = "0.11", features = ["json"] }

[dev-dependencies]
tokio-test = "0.4"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
```

## Best Practices

### Code Organization
- Use modules for code organization
- Keep functions small and focused
- Use meaningful names
- Document public APIs

### Error Handling
- Use Result for operations that can fail
- Implement proper error types
- Avoid unwrap() in production code
- Use ? for error propagation

### Performance
- Prefer iterators over loops when possible
- Use appropriate data structures
- Minimize allocations
- Profile and benchmark critical paths

### Safety
- Use safe Rust by default
- Use unsafe only when necessary
- Validate inputs
- Handle edge cases

## Validation Commands

```bash
# Check code
cargo check

# Run tests
cargo test

# Run with release optimizations
cargo build --release

# Run clippy linter
cargo clippy

# Format code
cargo fmt

# Generate documentation
cargo doc --open

# Run benchmarks
cargo bench
```