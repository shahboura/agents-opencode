---
description: Flutter/Dart best practices with state management, widget architecture, and testing
applyTo: '**/*.{dart}'
---

# Flutter Best Practices Instructions

## Project Structure

**Follow feature-based architecture:**

```
lib/
├── core/                 # Shared utilities and services
│   ├── constants/        # App constants
│   ├── services/         # API, database, etc.
│   ├── utils/            # Helper functions
│   └── widgets/          # Reusable widgets
├── features/             # Feature modules
│   ├── auth/
│   │   ├── data/         # Data layer (models, repositories)
│   │   ├── domain/       # Domain layer (entities, use cases)
│   │   ├── presentation/ # Presentation layer (screens, widgets)
│   │   └── auth.dart     # Feature barrel export
│   └── home/
├── shared/               # Shared across features
│   ├── models/           # Common data models
│   ├── widgets/          # Shared widgets
│   └── themes/           # App themes and styles
└── main.dart
```

## State Management

**Use Provider + Riverpod for state management:**

```dart
// Riverpod provider
final userProvider = StateNotifierProvider<UserNotifier, User?>((ref) {
  return UserNotifier();
});

class UserNotifier extends StateNotifier<User?> {
  UserNotifier() : super(null);

  Future<void> login(String email, String password) async {
    state = await _authService.login(email, password);
  }
}

// Usage in widget
class ProfileScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProvider);

    return user == null
        ? LoginScreen()
        : UserProfile(user: user);
  }
}
```

## Widget Architecture

**Use stateless widgets where possible:**

```dart
// ✅ Good - Stateless widget
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.user,
    this.radius = 24.0,
  });

  final User user;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      backgroundImage: NetworkImage(user.avatarUrl),
      child: Text(user.initials),
    );
  }
}

// ✅ Good - Consumer widget for state
class CounterButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);

    return ElevatedButton(
      onPressed: () => ref.read(counterProvider.notifier).increment(),
      child: Text('Count: $count'),
    );
  }
}
```

## Data Models

**Use freezed for immutable models:**

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
class User with _$User {
  const factory User({
    required int id,
    required String email,
    required String name,
    @JsonKey(name: 'avatar_url') String? avatarUrl,
    @Default(true) bool isActive,
    @Default([]) List<String> roles,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}
```

## Error Handling

**Use Result pattern:**

```dart
// Result type
sealed class Result<T> {
  const Result();

  factory Result.success(T data) = Success<T>;
  factory Result.error(String message) = Error<T>;
}

class Success<T> extends Result<T> {
  final T data;
  const Success(this.data);
}

class Error<T> extends Result<T> {
  final String message;
  const Error(this.message);
}

// Usage in repository
abstract class UserRepository {
  Future<Result<User>> getUser(int id);
}

class UserRepositoryImpl implements UserRepository {
  @override
  Future<Result<User>> getUser(int id) async {
    try {
      final user = await _api.getUser(id);
      return Result.success(user);
    } catch (e) {
      return Result.error('Failed to fetch user: $e');
    }
  }
}
```

## Async Programming

**Use async/await with proper error handling:**

```dart
class AuthService {
  Future<Result<User>> login(String email, String password) async {
    try {
      final response = await _dio.post('/login', data: {
        'email': email,
        'password': password,
      });

      final user = User.fromJson(response.data);
      return Result.success(user);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        return Result.error('Invalid credentials');
      }
      return Result.error('Network error: ${e.message}');
    } catch (e) {
      return Result.error('Unexpected error: $e');
    }
  }
}
```

## Testing

**Use flutter_test and mockito:**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

class MockUserRepository extends Mock implements UserRepository {}

void main() {
  late UserRepository mockRepo;
  late GetUserUseCase useCase;

  setUp(() {
    mockRepo = MockUserRepository();
    useCase = GetUserUseCase(mockRepo);
  });

  test('should return user when repository succeeds', () async {
    // Arrange
    const userId = 1;
    const expectedUser = User(id: 1, email: 'test@example.com', name: 'Test User');
    when(mockRepo.getUser(userId))
        .thenAnswer((_) async => Result.success(expectedUser));

    // Act
    final result = await useCase.execute(userId);

    // Assert
    expect(result, isA<Success<User>>());
    expect((result as Success<User>).data, expectedUser);
    verify(mockRepo.getUser(userId)).called(1);
  });

  test('should return error when repository fails', () async {
    // Arrange
    const userId = 1;
    const errorMessage = 'User not found';
    when(mockRepo.getUser(userId))
        .thenAnswer((_) async => Result.error(errorMessage));

    // Act
    final result = await useCase.execute(userId);

    // Assert
    expect(result, isA<Error<User>>());
    expect((result as Error<User>).message, errorMessage);
  });
}
```

## Widget Testing

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('UserAvatar displays user initials when no image',
      (WidgetTester tester) async {
    const user = User(id: 1, email: 'test@example.com', name: 'Test User');

    await tester.pumpWidget(
      MaterialApp(
        home: UserAvatar(user: user),
      ),
    );

    expect(find.text('TU'), findsOneWidget);
  });

  testWidgets('CounterButton increments count on tap',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          counterProvider.overrideWith((ref) => CounterNotifier()),
        ],
        child: MaterialApp(home: CounterButton()),
      ),
    );

    expect(find.text('Count: 0'), findsOneWidget);

    await tester.tap(find.byType(ElevatedButton));
    await tester.pump();

    expect(find.text('Count: 1'), findsOneWidget);
  });
}
```

## Dependency Injection

**Use riverpod for DI:**

```dart
// Service providers
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthServiceImpl();
});

final userRepositoryProvider = Provider<UserRepository>((ref) {
  final api = ref.watch(apiProvider);
  return UserRepositoryImpl(api);
});

// Use case providers
final loginUseCaseProvider = Provider<LoginUseCase>((ref) {
  final authService = ref.watch(authServiceProvider);
  return LoginUseCase(authService);
});

// Repository providers with interface
final userRepoProvider = Provider<UserRepository>((ref) {
  return UserRepositoryImpl(ref.watch(dioProvider));
});
```

## Navigation

**Use go_router for type-safe routing:**

```dart
// Route definitions
final router = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/user/:id',
      builder: (context, state) {
        final userId = int.parse(state.pathParameters['id']!);
        return UserDetailScreen(userId: userId);
      },
    ),
  ],
);

// Usage
ElevatedButton(
  onPressed: () => context.go('/user/123'),
  child: const Text('View User'),
);
```

## Theming

**Use ThemeExtension for custom themes:**

```dart
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.success,
    required this.warning,
    required this.error,
  });

  final Color success;
  final Color warning;
  final Color error;

  @override
  ThemeExtension<AppColors> copyWith({
    Color? success,
    Color? warning,
    Color? error,
  }) {
    return AppColors(
      success: success ?? this.success,
      warning: warning ?? this.warning,
      error: error ?? this.error,
    );
  }

  @override
  ThemeExtension<AppColors> lerp(
    covariant ThemeExtension<AppColors>? other,
    double t,
  ) {
    if (other is! AppColors) return this;
    return AppColors(
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      error: Color.lerp(error, other.error, t)!,
    );
  }
}
```

## Code Quality Requirements

**Every Flutter file MUST:**
1. ✅ Pass `flutter analyze` with zero warnings
2. ✅ Pass `flutter test` with good coverage
3. ✅ Use const constructors where possible
4. ✅ Follow effective Dart guidelines
5. ✅ Have proper error handling
6. ✅ Include widget tests for UI components
7. ✅ Use immutable data models (freezed)
8. ✅ Follow single responsibility principle

## Build Commands

```bash
# Analyze code
flutter analyze

# Run tests
flutter test

# Run tests with coverage
flutter test --coverage

# Format code
dart format .

# Build APK
flutter build apk --release

# Build app bundle
flutter build appbundle --release
```