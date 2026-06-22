# SwiftUI Native Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native iPhone SwiftUI app for the bipolar mood tracker with feature parity to the web app, using the existing Supabase backend.

**Architecture:** `@Observable` ViewModels (one per screen) backed by `supabase-swift` for auth and PostgREST queries. A shared `AuthViewModel` at the app root switches between the auth flow and a three-tab `MainTabView`. All async work uses `async/await`.

**Tech Stack:** SwiftUI, Swift Charts, supabase-swift 2.x, iOS 17+, Xcode 15+

## Global Constraints

- iOS 17.0 minimum deployment target
- iPhone only — no iPad-specific layouts
- `supabase-swift` is the only third-party dependency
- All source files live in `~/Documents/moodtracker/moodtracker+/moodtracker+/`
- Test files live in `~/Documents/moodtracker/moodtracker+/moodtracker+Tests/`
- Module name for `@testable import` is `moodtracker_` (Xcode converts `+` to `_`)
- `snake_case` DB column names map to `camelCase` Swift properties via explicit `CodingKeys`
- Never hardcode Supabase URL or anon key — always read from `Bundle.main.infoDictionary`

---

### Task 1: Project Setup

**Files:**
- Create: `moodtracker+/Secrets.xcconfig`
- Create: `moodtracker+/Secrets.xcconfig.example`
- Modify: `moodtracker+/moodtracker+/Info.plist` (add two keys + URL scheme)
- Modify: Xcode project build configurations (reference `.xcconfig`)

**Interfaces:**
- Produces: `Bundle.main.infoDictionary?["SUPABASE_URL"]` and `Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"]` available as `String` at runtime; `moodtracker://` URL scheme registered

- [ ] **Step 1: Create `Secrets.xcconfig.example`**

In Finder or terminal, create this file at the repo root (`~/Documents/moodtracker/moodtracker+/Secrets.xcconfig.example`):

```
// Copy this file to Secrets.xcconfig and fill in your values.
// Secrets.xcconfig is gitignored — never commit it.
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_ANON_KEY = your-anon-key-here
```

Commit this file to git.

- [ ] **Step 2: Create `Secrets.xcconfig`**

Copy `Secrets.xcconfig.example` to `Secrets.xcconfig` and fill in your actual Supabase project URL and anon key from the Supabase dashboard (Settings → API).

Add `Secrets.xcconfig` to `.gitignore`:
```
Secrets.xcconfig
```

- [ ] **Step 3: Reference `Secrets.xcconfig` in Xcode build configurations**

In Xcode:
1. Click the top-level project (blue icon) in the navigator
2. Select the **moodtracker+** project (not the target)
3. Under **Configurations**, expand **Debug** — click the `+` on the `moodtracker+` row and select `Secrets.xcconfig`
4. Repeat for **Release**

- [ ] **Step 4: Forward keys into Info.plist**

Open `moodtracker+/moodtracker+/Info.plist` in Xcode's source editor (right-click → Open As → Source Code) and add inside the root `<dict>`:

```xml
<key>SUPABASE_URL</key>
<string>$(SUPABASE_URL)</string>
<key>SUPABASE_ANON_KEY</key>
<string>$(SUPABASE_ANON_KEY)</string>
```

- [ ] **Step 5: Register the `moodtracker` URL scheme**

Still in `Info.plist`, add the URL scheme so Supabase auth deep links land in the app:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.moodtracker.auth</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>moodtracker</string>
        </array>
    </dict>
</array>
```

- [ ] **Step 6: Add supabase-swift via SPM**

In Xcode:
1. File → Add Package Dependencies
2. Enter URL: `https://github.com/supabase/supabase-swift`
3. Set dependency rule to **Up to Next Major Version** from `2.0.0`
4. Add the **Supabase** library to the `moodtracker+` target

- [ ] **Step 7: Add a Unit Test target**

In Xcode:
1. File → New → Target → Unit Testing Bundle
2. Name it `moodtracker+Tests`
3. Set **Target to be Tested** to `moodtracker+`
4. Confirm the test target appears in the project navigator

- [ ] **Step 8: Verify the build succeeds**

In Xcode, build with ⌘B. Expected: Build Succeeded with no errors.

- [ ] **Step 9: Commit**

```bash
cd ~/Documents/moodtracker/moodtracker+
git add Secrets.xcconfig.example .gitignore moodtracker+.xcodeproj
git commit -m "feat: project setup — xcconfig secrets, URL scheme, supabase-swift SPM, test target"
```

---

### Task 2: DailyLog Model + SleepCalculator

**Files:**
- Create: `moodtracker+/Utilities/DateFormatters.swift`
- Create: `moodtracker+/Utilities/SleepCalculator.swift`
- Create: `moodtracker+/Models/DailyLog.swift`
- Create (test): `moodtracker+Tests/SleepCalculatorTests.swift`
- Create (test): `moodtracker+Tests/DailyLogTests.swift`
- Delete: `moodtracker+/ContentView.swift` (default template — replaced in Task 4)

**Interfaces:**
- Produces:
  - `func sleepHours(bedtime: String, wakeTime: String) -> Double?`
  - `struct DailyLog: Codable, Identifiable` with all DB fields
  - `struct DailyLogUpdate: Encodable` (all optional fields, snake_case CodingKeys)
  - `struct DailyLogInsert: Encodable` (adds `userId` and `date`)
  - `DateFormatter.isoDate` — `"yyyy-MM-dd"` formatter (static)
  - `DateFormatter.hhmmss` — `"HH:mm:ss"` formatter (static)
  - `extension String { var asLogDate: Date? }` — parses `"yyyy-MM-dd"` strings

- [ ] **Step 1: Create the group folders in Xcode**

In Xcode's project navigator, right-click `moodtracker+` group → New Group Without Folder for each of: `App`, `Models`, `ViewModels`, `Views`, `Utilities`.

Inside `Views`, add groups: `Auth`, `Today`, `History`, `Charts`, `Shared`, `Layout`.

- [ ] **Step 2: Write the failing tests for `SleepCalculator`**

Create `moodtracker+Tests/SleepCalculatorTests.swift` and add it to the `moodtracker+Tests` target:

```swift
import XCTest
@testable import moodtracker_

final class SleepCalculatorTests: XCTestCase {
    func testNormalSleep() {
        XCTAssertEqual(sleepHours(bedtime: "23:00", wakeTime: "07:00"), 8.0)
    }
    func testOvernightCrossing() {
        XCTAssertEqual(sleepHours(bedtime: "22:30", wakeTime: "06:30"), 8.0)
    }
    func testFractionalHours() {
        XCTAssertEqual(sleepHours(bedtime: "22:30", wakeTime: "06:00"), 7.5)
    }
    func testWithSeconds() {
        XCTAssertEqual(sleepHours(bedtime: "23:00:00", wakeTime: "07:00:00"), 8.0)
    }
    func testShortSleep() {
        XCTAssertEqual(sleepHours(bedtime: "00:00", wakeTime: "06:00"), 6.0)
    }
    func testInvalidBedtime() {
        XCTAssertNil(sleepHours(bedtime: "", wakeTime: "07:00"))
    }
    func testInvalidWakeTime() {
        XCTAssertNil(sleepHours(bedtime: "23:00", wakeTime: ""))
    }
    func testMiddayNap() {
        XCTAssertEqual(sleepHours(bedtime: "13:00", wakeTime: "14:30"), 1.5)
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

⌘U in Xcode. Expected: all 8 tests fail with "unresolved identifier 'sleepHours'".

- [ ] **Step 4: Create `DateFormatters.swift`**

Create `moodtracker+/Utilities/DateFormatters.swift`, add to `moodtracker+` target:

```swift
import Foundation

extension DateFormatter {
    static let isoDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    static let hhmmss: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "HH:mm:ss"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()
}

extension String {
    var asLogDate: Date? {
        DateFormatter.isoDate.date(from: self)
    }
}
```

- [ ] **Step 5: Create `SleepCalculator.swift`**

Create `moodtracker+/Utilities/SleepCalculator.swift`, add to `moodtracker+` target:

```swift
import Foundation

func sleepHours(bedtime: String, wakeTime: String) -> Double? {
    func parseMinutes(_ s: String) -> Int? {
        let trimmed = String(s.prefix(5)) // "HH:mm" from "HH:mm:ss"
        let parts = trimmed.split(separator: ":").map(String.init)
        guard parts.count == 2,
              let h = Int(parts[0]),
              let m = Int(parts[1]) else { return nil }
        return h * 60 + m
    }
    guard let bedMins = parseMinutes(bedtime),
          let wakeMins = parseMinutes(wakeTime) else { return nil }
    var diff = wakeMins - bedMins
    if diff <= 0 { diff += 24 * 60 }
    return Double(diff) / 60.0
}
```

- [ ] **Step 6: Run tests to verify SleepCalculator passes**

⌘U. Expected: all 8 `SleepCalculatorTests` pass.

- [ ] **Step 7: Write failing tests for `DailyLog` Codable**

Create `moodtracker+Tests/DailyLogTests.swift`, add to `moodtracker+Tests` target:

```swift
import XCTest
@testable import moodtracker_

final class DailyLogTests: XCTestCase {
    private let fullJSON = """
    {
      "id": "abc-123",
      "user_id": "user-1",
      "date": "2026-06-22",
      "mood_rating": 7,
      "mood_energy": 6,
      "mood_anxiety": 4,
      "meals_count": 3,
      "exercised": true,
      "sleep_hours": 7.5,
      "sleep_quality": 4,
      "bedtime": "23:00:00",
      "wake_time": "06:30:00",
      "tonight_bedtime": "22:30:00",
      "gratitude": "Sunshine and coffee",
      "created_at": "2026-06-22T10:00:00Z",
      "updated_at": "2026-06-22T10:00:00Z"
    }
    """.data(using: .utf8)!

    func testFullDecoding() throws {
        let log = try JSONDecoder().decode(DailyLog.self, from: fullJSON)
        XCTAssertEqual(log.id, "abc-123")
        XCTAssertEqual(log.date, "2026-06-22")
        XCTAssertEqual(log.moodRating, 7)
        XCTAssertEqual(log.moodEnergy, 6)
        XCTAssertEqual(log.moodAnxiety, 4)
        XCTAssertEqual(log.mealsCount, 3)
        XCTAssertEqual(log.exercised, true)
        XCTAssertEqual(log.sleepHours, 7.5)
        XCTAssertEqual(log.sleepQuality, 4)
        XCTAssertEqual(log.bedtime, "23:00:00")
        XCTAssertEqual(log.wakeTime, "06:30:00")
        XCTAssertEqual(log.tonightBedtime, "22:30:00")
        XCTAssertEqual(log.gratitude, "Sunshine and coffee")
    }

    func testNullFieldsDecoding() throws {
        let json = """
        {
          "id": "abc-123", "user_id": "user-1", "date": "2026-06-22",
          "mood_rating": null, "mood_energy": null, "mood_anxiety": null,
          "meals_count": null, "exercised": null, "sleep_hours": null,
          "sleep_quality": null, "bedtime": null, "wake_time": null,
          "tonight_bedtime": null, "gratitude": null,
          "created_at": "2026-06-22T10:00:00Z",
          "updated_at": "2026-06-22T10:00:00Z"
        }
        """.data(using: .utf8)!
        let log = try JSONDecoder().decode(DailyLog.self, from: json)
        XCTAssertNil(log.moodRating)
        XCTAssertNil(log.gratitude)
        XCTAssertNil(log.tonightBedtime)
    }

    func testUpdateEncoding() throws {
        let update = DailyLogUpdate(moodRating: 8, exercised: true, gratitude: "Test")
        let data = try JSONEncoder().encode(update)
        let dict = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        XCTAssertEqual(dict["mood_rating"] as? Int, 8)
        XCTAssertEqual(dict["exercised"] as? Bool, true)
        XCTAssertEqual(dict["gratitude"] as? String, "Test")
    }
}
```

- [ ] **Step 8: Run tests to verify they fail**

⌘U. Expected: tests fail with "cannot find type 'DailyLog'".

- [ ] **Step 9: Create `DailyLog.swift`**

Create `moodtracker+/Models/DailyLog.swift`, add to `moodtracker+` target:

```swift
import Foundation

struct DailyLog: Codable, Identifiable {
    let id: String
    let userId: String
    let date: String
    var moodRating: Int?
    var moodEnergy: Int?
    var moodAnxiety: Int?
    var mealsCount: Int?
    var exercised: Bool?
    var sleepHours: Double?
    var sleepQuality: Int?
    var bedtime: String?
    var wakeTime: String?
    var tonightBedtime: String?
    var gratitude: String?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case date
        case moodRating = "mood_rating"
        case moodEnergy = "mood_energy"
        case moodAnxiety = "mood_anxiety"
        case mealsCount = "meals_count"
        case exercised
        case sleepHours = "sleep_hours"
        case sleepQuality = "sleep_quality"
        case bedtime
        case wakeTime = "wake_time"
        case tonightBedtime = "tonight_bedtime"
        case gratitude
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct DailyLogUpdate: Encodable {
    var moodRating: Int?
    var moodEnergy: Int?
    var moodAnxiety: Int?
    var mealsCount: Int?
    var exercised: Bool?
    var sleepHours: Double?
    var sleepQuality: Int?
    var bedtime: String?
    var wakeTime: String?
    var tonightBedtime: String?
    var gratitude: String?

    enum CodingKeys: String, CodingKey {
        case moodRating = "mood_rating"
        case moodEnergy = "mood_energy"
        case moodAnxiety = "mood_anxiety"
        case mealsCount = "meals_count"
        case exercised
        case sleepHours = "sleep_hours"
        case sleepQuality = "sleep_quality"
        case bedtime
        case wakeTime = "wake_time"
        case tonightBedtime = "tonight_bedtime"
        case gratitude
    }
}

struct DailyLogInsert: Encodable {
    let userId: String
    let date: String
    var moodRating: Int?
    var moodEnergy: Int?
    var moodAnxiety: Int?
    var mealsCount: Int?
    var exercised: Bool?
    var sleepHours: Double?
    var sleepQuality: Int?
    var bedtime: String?
    var wakeTime: String?
    var tonightBedtime: String?
    var gratitude: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case date
        case moodRating = "mood_rating"
        case moodEnergy = "mood_energy"
        case moodAnxiety = "mood_anxiety"
        case mealsCount = "meals_count"
        case exercised
        case sleepHours = "sleep_hours"
        case sleepQuality = "sleep_quality"
        case bedtime
        case wakeTime = "wake_time"
        case tonightBedtime = "tonight_bedtime"
        case gratitude
    }
}
```

- [ ] **Step 10: Run tests to verify all pass**

⌘U. Expected: all `SleepCalculatorTests` and `DailyLogTests` pass.

- [ ] **Step 11: Commit**

```bash
git add moodtracker+/Utilities/ moodtracker+/Models/ \
        moodtracker+Tests/SleepCalculatorTests.swift \
        moodtracker+Tests/DailyLogTests.swift \
        moodtracker+.xcodeproj
git commit -m "feat: DailyLog model, SleepCalculator, DateFormatters with tests"
```

---

### Task 3: SupabaseClient + AuthViewModel

**Files:**
- Create: `moodtracker+/App/SupabaseClient+Shared.swift`
- Create: `moodtracker+/ViewModels/AuthViewModel.swift`

**Interfaces:**
- Consumes: `Bundle.main.infoDictionary["SUPABASE_URL/ANON_KEY"]` (Task 1), `Supabase` module (Task 1 SPM)
- Produces:
  - `SupabaseClient.shared: SupabaseClient` — singleton, crashes with clear message if keys missing
  - `@Observable final class AuthViewModel` with properties: `session: Session?`, `isPasswordRecovery: Bool`, `isInitializing: Bool`, `isLoading: Bool`, `errorMessage: String?`
  - Methods: `signIn(email:password:)`, `signUp(email:password:)`, `signOut()`, `sendPasswordReset(email:)`, `updatePassword(_:)`, `handleURL(_:)`, `signInWithApple()` (stub)

- [ ] **Step 1: Create `SupabaseClient+Shared.swift`**

Create `moodtracker+/App/SupabaseClient+Shared.swift`, add to `moodtracker+` target:

```swift
import Foundation
import Supabase

extension SupabaseClient {
    static let shared: SupabaseClient = {
        guard
            let urlString = Bundle.main.infoDictionary?["SUPABASE_URL"] as? String,
            let key = Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String,
            !urlString.isEmpty, !key.isEmpty,
            let url = URL(string: urlString)
        else {
            fatalError("Missing or invalid SUPABASE_URL / SUPABASE_ANON_KEY in Info.plist. " +
                       "Copy Secrets.xcconfig.example → Secrets.xcconfig and fill in your values.")
        }
        return SupabaseClient(supabaseURL: url, supabaseKey: key)
    }()
}
```

- [ ] **Step 2: Create `AuthViewModel.swift`**

Create `moodtracker+/ViewModels/AuthViewModel.swift`, add to `moodtracker+` target:

```swift
import Foundation
import Observation
import Supabase

@Observable
final class AuthViewModel {
    private(set) var session: Session?
    private(set) var isPasswordRecovery = false
    private(set) var isInitializing = true
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    init() {
        Task { await observeAuthState() }
    }

    private func observeAuthState() async {
        for await (event, session) in await SupabaseClient.shared.auth.authStateChanges {
            self.session = session
            self.isPasswordRecovery = (event == .passwordRecovery)
            if isInitializing { isInitializing = false }
        }
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        do {
            try await SupabaseClient.shared.auth.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signUp(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        do {
            try await SupabaseClient.shared.auth.signUp(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func signOut() async {
        errorMessage = nil
        do {
            try await SupabaseClient.shared.auth.signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sendPasswordReset(email: String) async {
        isLoading = true
        errorMessage = nil
        do {
            try await SupabaseClient.shared.auth.resetPasswordForEmail(
                email,
                redirectTo: URL(string: "moodtracker://login-callback")
            )
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func updatePassword(_ newPassword: String) async {
        isLoading = true
        errorMessage = nil
        do {
            try await SupabaseClient.shared.auth.update(
                user: UserAttributes(password: newPassword)
            )
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func handleURL(_ url: URL) async {
        do {
            try await SupabaseClient.shared.auth.session(from: url)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // TODO: requires Apple Developer account
    func signInWithApple() async {}
}
```

- [ ] **Step 3: Build to verify no errors**

⌘B. Expected: Build Succeeded.

- [ ] **Step 4: Commit**

```bash
git add moodtracker+/App/SupabaseClient+Shared.swift \
        moodtracker+/ViewModels/AuthViewModel.swift \
        moodtracker+.xcodeproj
git commit -m "feat: SupabaseClient singleton and AuthViewModel"
```

---

### Task 4: App Root + Auth Views

**Files:**
- Modify: `moodtracker+/App/moodtracker_App.swift`
- Delete content of: `moodtracker+/ContentView.swift` (move to `moodtracker+/Views/Layout/MainTabView.swift`)
- Create: `moodtracker+/Views/Auth/AuthView.swift`
- Create: `moodtracker+/Views/Auth/SignInView.swift`
- Create: `moodtracker+/Views/Auth/SignUpView.swift`
- Create: `moodtracker+/Views/Auth/ForgotPasswordView.swift`
- Create: `moodtracker+/Views/Auth/ResetPasswordView.swift`
- Create: `moodtracker+/Views/Layout/MainTabView.swift`

**Interfaces:**
- Consumes: `AuthViewModel` (Task 3)
- Produces: fully working auth flow — sign in, sign up, forgot password, reset password. `MainTabView` renders three empty placeholder tabs (filled in Tasks 5–7).

- [ ] **Step 1: Update `moodtracker_App.swift`**

Replace the entire contents of `moodtracker+/App/moodtracker_App.swift`:

```swift
import SwiftUI

@main
struct moodtracker_App: App {
    @State private var auth = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if auth.isInitializing {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if auth.session == nil || auth.isPasswordRecovery {
                    AuthView()
                } else {
                    MainTabView()
                }
            }
            .environment(auth)
            .onOpenURL { url in
                Task { await auth.handleURL(url) }
            }
        }
    }
}
```

- [ ] **Step 2: Create `AuthView.swift`**

Create `moodtracker+/Views/Auth/AuthView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

enum AuthMode { case signIn, signUp, forgotPassword }

struct AuthView: View {
    @State private var mode: AuthMode = .signIn
    @Environment(AuthViewModel.self) private var auth

    var body: some View {
        if auth.isPasswordRecovery {
            ResetPasswordView()
        } else {
            switch mode {
            case .signIn:        SignInView(mode: $mode)
            case .signUp:        SignUpView(mode: $mode)
            case .forgotPassword: ForgotPasswordView(mode: $mode)
            }
        }
    }
}
```

- [ ] **Step 3: Create `SignInView.swift`**

Create `moodtracker+/Views/Auth/SignInView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct SignInView: View {
    @Binding var mode: AuthMode
    @Environment(AuthViewModel.self) private var auth
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .textContentType(.emailAddress)
                    SecureField("Password", text: $password)
                        .textContentType(.password)
                }

                Section {
                    Button {
                        Task { await auth.signIn(email: email, password: password) }
                    } label: {
                        Group {
                            if auth.isLoading { ProgressView() }
                            else { Text("Sign In") }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(auth.isLoading || email.isEmpty || password.isEmpty)

                    // TODO: requires Apple Developer account
                    Button("Sign in with Apple") {}
                        .disabled(true)
                        .foregroundStyle(.secondary)
                }

                if let error = auth.errorMessage {
                    Section {
                        Text(error).foregroundStyle(.red).font(.caption)
                    }
                }
            }
            .navigationTitle("Sign In")
            .toolbar {
                ToolbarItemGroup(placement: .bottomBar) {
                    Button("Create account") { mode = .signUp }
                    Spacer()
                    Button("Forgot password?") { mode = .forgotPassword }
                }
            }
        }
    }
}
```

- [ ] **Step 4: Create `SignUpView.swift`**

Create `moodtracker+/Views/Auth/SignUpView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct SignUpView: View {
    @Binding var mode: AuthMode
    @Environment(AuthViewModel.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @State private var confirm = ""
    @State private var didSignUp = false

    var body: some View {
        NavigationStack {
            if didSignUp {
                ContentUnavailableView(
                    "Check your email",
                    systemImage: "envelope.badge",
                    description: Text("Click the verification link to activate your account.")
                )
            } else {
                Form {
                    Section {
                        TextField("Email", text: $email)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .textContentType(.emailAddress)
                        SecureField("Password", text: $password)
                            .textContentType(.newPassword)
                        SecureField("Confirm password", text: $confirm)
                            .textContentType(.newPassword)
                    }

                    Section {
                        Button {
                            Task {
                                await auth.signUp(email: email, password: password)
                                if auth.errorMessage == nil { didSignUp = true }
                            }
                        } label: {
                            Group {
                                if auth.isLoading { ProgressView() }
                                else { Text("Create Account") }
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .disabled(
                            auth.isLoading || email.isEmpty ||
                            password.isEmpty || password != confirm
                        )
                    }

                    if let error = auth.errorMessage {
                        Section {
                            Text(error).foregroundStyle(.red).font(.caption)
                        }
                    }
                }
                .navigationTitle("Create Account")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Back") { mode = .signIn }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 5: Create `ForgotPasswordView.swift`**

Create `moodtracker+/Views/Auth/ForgotPasswordView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct ForgotPasswordView: View {
    @Binding var mode: AuthMode
    @Environment(AuthViewModel.self) private var auth
    @State private var email = ""
    @State private var sent = false

    var body: some View {
        NavigationStack {
            if sent {
                ContentUnavailableView(
                    "Email sent",
                    systemImage: "envelope",
                    description: Text("Check your inbox for a password reset link.")
                )
            } else {
                Form {
                    Section {
                        TextField("Email", text: $email)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .textContentType(.emailAddress)
                    }

                    Section {
                        Button {
                            Task {
                                await auth.sendPasswordReset(email: email)
                                if auth.errorMessage == nil { sent = true }
                            }
                        } label: {
                            Group {
                                if auth.isLoading { ProgressView() }
                                else { Text("Send Reset Link") }
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .disabled(auth.isLoading || email.isEmpty)
                    }

                    if let error = auth.errorMessage {
                        Section {
                            Text(error).foregroundStyle(.red).font(.caption)
                        }
                    }
                }
                .navigationTitle("Forgot Password")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Back") { mode = .signIn }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 6: Create `ResetPasswordView.swift`**

Create `moodtracker+/Views/Auth/ResetPasswordView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct ResetPasswordView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var newPassword = ""
    @State private var confirm = ""

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("New password", text: $newPassword)
                        .textContentType(.newPassword)
                    SecureField("Confirm password", text: $confirm)
                        .textContentType(.newPassword)
                }

                Section {
                    Button {
                        Task { await auth.updatePassword(newPassword) }
                    } label: {
                        Group {
                            if auth.isLoading { ProgressView() }
                            else { Text("Update Password") }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .disabled(
                        auth.isLoading || newPassword.isEmpty || newPassword != confirm
                    )
                }

                if let error = auth.errorMessage {
                    Section {
                        Text(error).foregroundStyle(.red).font(.caption)
                    }
                }
            }
            .navigationTitle("Reset Password")
        }
    }
}
```

- [ ] **Step 7: Create `MainTabView.swift`**

Create `moodtracker+/Views/Layout/MainTabView.swift`, add to `moodtracker+` target. The Today and Charts tabs use placeholder text — they get real content in Tasks 5 and 7.

```swift
import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            NavigationStack {
                Text("Today — coming in Task 5")
                    .navigationTitle("Today")
            }
            .tabItem { Label("Today", systemImage: "calendar") }

            NavigationStack {
                HistoryView()
            }
            .tabItem { Label("History", systemImage: "list.bullet") }

            NavigationStack {
                Text("Charts — coming in Task 7")
                    .navigationTitle("Charts")
            }
            .tabItem { Label("Charts", systemImage: "chart.line.uptrend.xyaxis") }
        }
    }
}
```

- [ ] **Step 8: Delete the default `ContentView.swift`**

In Xcode's project navigator, right-click `ContentView.swift` → Delete → Move to Trash.

- [ ] **Step 9: Build and run manually**

⌘R on a simulator. Expected:
- App launches showing a spinner briefly, then the Sign In form
- Tapping "Create account" shows the Sign Up form
- Tapping "Back" returns to Sign In
- Tapping "Forgot password?" shows the Forgot Password form
- Entering credentials and tapping "Sign In" either signs in (showing three-tab layout with placeholders) or shows an error

- [ ] **Step 10: Commit**

```bash
git add moodtracker+/App/moodtracker_App.swift \
        moodtracker+/Views/Auth/ \
        moodtracker+/Views/Layout/ \
        moodtracker+.xcodeproj
git commit -m "feat: auth flow — sign in, sign up, forgot/reset password, app root"
```

---

### Task 5: Today Screen

**Files:**
- Create: `moodtracker+/Views/Shared/LabeledSlider.swift`
- Create: `moodtracker+/ViewModels/TodayViewModel.swift`
- Create: `moodtracker+/Views/Today/MoodSection.swift`
- Create: `moodtracker+/Views/Today/FoodSection.swift`
- Create: `moodtracker+/Views/Today/ExerciseSection.swift`
- Create: `moodtracker+/Views/Today/SleepSection.swift`
- Create: `moodtracker+/Views/Today/GratitudeSection.swift`
- Create: `moodtracker+/Views/Today/TodayView.swift`
- Modify: `moodtracker+/Views/Layout/MainTabView.swift` (replace Today placeholder with `TodayView`)

**Interfaces:**
- Consumes: `DailyLog`, `DailyLogUpdate`, `DailyLogInsert`, `sleepHours()`, `DateFormatter.isoDate/hhmmss`, `SupabaseClient.shared`, `AuthViewModel` (from Tasks 2–4)
- Produces:
  - `struct LabeledSlider: View` — `(label: String, value: Binding<Double>, min: Double, max: Double)`
  - `@Observable final class TodayViewModel` — `init(date: String)`, `save() async`
  - `TodayView(date: String)` — defaults to today's date; used by both the Today tab and History navigation

- [ ] **Step 1: Create `LabeledSlider.swift`**

Create `moodtracker+/Views/Shared/LabeledSlider.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct LabeledSlider: View {
    let label: String
    @Binding var value: Double
    var min: Double = 1
    var max: Double = 10

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.subheadline)
                Spacer()
                Text("\(Int(value.rounded()))")
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.blue)
            }
            Slider(value: $value, in: min...max, step: 1)
        }
    }
}
```

- [ ] **Step 2: Create `TodayViewModel.swift`**

Create `moodtracker+/ViewModels/TodayViewModel.swift`, add to `moodtracker+` target:

```swift
import Foundation
import Observation
import Supabase

@Observable
final class TodayViewModel {
    let date: String
    private(set) var isLoading = true
    private(set) var isSaving = false
    private(set) var saveError: String?
    private(set) var saved = false

    // Form state — all stored properties must be in the class body (not extensions) for @Observable
    var moodRating: Double = 5
    var moodEnergy: Double = 5
    var moodAnxiety: Double = 5
    var mealsCount: Int = 0
    var exercised = false
    var wakeTime: Date?       // nil = not set; displayed as DatePicker
    var sleepQuality: Double = 3
    var tonightBedtime: Date? // nil = not set; displayed as DatePicker
    var gratitude = ""

    // Not displayed; pre-filled from yesterday's tonightBedtime; used to calc sleep_hours
    private var bedtime: String?
    private var existingLog: DailyLog?

    init(date: String) {
        self.date = date
        Task { await load() }
    }

    private func load() async {
        isLoading = true
        let yesterdayStr = Self.dateOffset(from: date, by: -1)
        async let todayFetch: DailyLog? = fetchLog(for: date)
        async let yFetch: DailyLog? = fetchLog(for: yesterdayStr)
        let (today, yesterday) = await (todayFetch, yFetch)

        existingLog = today
        let autoBedtime = yesterday?.tonightBedtime

        if let log = today {
            moodRating = Double(log.moodRating ?? 5)
            moodEnergy = Double(log.moodEnergy ?? 5)
            moodAnxiety = Double(log.moodAnxiety ?? 5)
            mealsCount = log.mealsCount ?? 0
            exercised = log.exercised ?? false
            bedtime = log.bedtime ?? autoBedtime
            wakeTime = log.wakeTime.flatMap { parseTimeString($0) }
            sleepQuality = Double(log.sleepQuality ?? 3)
            tonightBedtime = log.tonightBedtime.flatMap { parseTimeString($0) }
            gratitude = log.gratitude ?? ""
        } else {
            bedtime = autoBedtime
        }
        isLoading = false
    }

    func save() async {
        isSaving = true
        saveError = nil

        let wakeStr = wakeTime.map { DateFormatter.hhmmss.string(from: $0) }
        let tonightStr = tonightBedtime.map { DateFormatter.hhmmss.string(from: $0) }
        let computedHours: Double?
        if let b = bedtime, let w = wakeStr {
            computedHours = sleepHours(bedtime: b, wakeTime: w)
        } else {
            computedHours = nil
        }

        let update = DailyLogUpdate(
            moodRating: Int(moodRating.rounded()),
            moodEnergy: Int(moodEnergy.rounded()),
            moodAnxiety: Int(moodAnxiety.rounded()),
            mealsCount: mealsCount,
            exercised: exercised,
            sleepHours: computedHours,
            sleepQuality: Int(sleepQuality.rounded()),
            bedtime: bedtime,
            wakeTime: wakeStr,
            tonightBedtime: tonightStr,
            gratitude: gratitude.isEmpty ? nil : gratitude
        )

        do {
            if let existing = existingLog {
                let updated: DailyLog = try await SupabaseClient.shared
                    .from("daily_logs")
                    .update(update)
                    .eq("id", value: existing.id)
                    .select()
                    .single()
                    .execute()
                    .value
                existingLog = updated
                bedtime = updated.bedtime
            } else {
                let session = try await SupabaseClient.shared.auth.session
                let insert = DailyLogInsert(
                    userId: session.user.id.uuidString,
                    date: date,
                    moodRating: update.moodRating,
                    moodEnergy: update.moodEnergy,
                    moodAnxiety: update.moodAnxiety,
                    mealsCount: update.mealsCount,
                    exercised: update.exercised,
                    sleepHours: update.sleepHours,
                    sleepQuality: update.sleepQuality,
                    bedtime: update.bedtime,
                    wakeTime: update.wakeTime,
                    tonightBedtime: update.tonightBedtime,
                    gratitude: update.gratitude
                )
                let inserted: DailyLog = try await SupabaseClient.shared
                    .from("daily_logs")
                    .insert(insert)
                    .select()
                    .single()
                    .execute()
                    .value
                existingLog = inserted
            }
            saved = true
            isSaving = false
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            saved = false
        } catch {
            saveError = error.localizedDescription
            isSaving = false
        }
    }

    private func fetchLog(for dateStr: String) async -> DailyLog? {
        try? await SupabaseClient.shared
            .from("daily_logs")
            .select()
            .eq("date", value: dateStr)
            .maybeSingle()
            .execute()
            .value
    }

    private static func dateOffset(from dateStr: String, by days: Int) -> String {
        guard let date = DateFormatter.isoDate.date(from: dateStr),
              let result = Calendar.current.date(byAdding: .day, value: days, to: date)
        else { return dateStr }
        return DateFormatter.isoDate.string(from: result)
    }
}

private func parseTimeString(_ s: String) -> Date? {
    let format = s.count > 5 ? "HH:mm:ss" : "HH:mm"
    let f = DateFormatter()
    f.dateFormat = format
    f.locale = Locale(identifier: "en_US_POSIX")
    return f.date(from: String(s.prefix(8)))
}
```

- [ ] **Step 3: Create `MoodSection.swift`**

Create `moodtracker+/Views/Today/MoodSection.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct MoodSection: View {
    @Binding var moodRating: Double
    @Binding var moodEnergy: Double
    @Binding var moodAnxiety: Double

    var body: some View {
        Section("Mood") {
            LabeledSlider(label: "Mood", value: $moodRating)
            LabeledSlider(label: "Energy", value: $moodEnergy)
            LabeledSlider(label: "Anxiety", value: $moodAnxiety)
        }
    }
}
```

- [ ] **Step 4: Create `FoodSection.swift`**

Create `moodtracker+/Views/Today/FoodSection.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct FoodSection: View {
    @Binding var mealsCount: Int

    var body: some View {
        Section("Food") {
            Stepper("Meals today: \(mealsCount)", value: $mealsCount, in: 0...10)
        }
    }
}
```

- [ ] **Step 5: Create `ExerciseSection.swift`**

Create `moodtracker+/Views/Today/ExerciseSection.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct ExerciseSection: View {
    @Binding var exercised: Bool

    var body: some View {
        Section("Exercise") {
            Toggle("Exercised today", isOn: $exercised)
        }
    }
}
```

- [ ] **Step 6: Create `SleepSection.swift`**

Create `moodtracker+/Views/Today/SleepSection.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct SleepSection: View {
    @Binding var wakeTime: Date?
    @Binding var sleepQuality: Double
    @Binding var tonightBedtime: Date?

    var body: some View {
        Section {
            if let wt = wakeTime {
                DatePicker(
                    "Wake time",
                    selection: Binding(get: { wt }, set: { wakeTime = $0 }),
                    displayedComponents: .hourAndMinute
                )
                Button("Clear wake time") { wakeTime = nil }
                    .foregroundStyle(.red)
            } else {
                Button("Set wake time") { wakeTime = Date() }
            }
            LabeledSlider(label: "Sleep quality", value: $sleepQuality, min: 1, max: 5)
        } header: {
            Text("Last night's sleep")
        }

        Section {
            if let tb = tonightBedtime {
                DatePicker(
                    "Tonight's bedtime",
                    selection: Binding(get: { tb }, set: { tonightBedtime = $0 }),
                    displayedComponents: .hourAndMinute
                )
                Button("Clear bedtime") { tonightBedtime = nil }
                    .foregroundStyle(.red)
            } else {
                Button("Set tonight's bedtime") { tonightBedtime = Date() }
            }
        } header: {
            Text("Tonight")
        }
    }
}
```

- [ ] **Step 7: Create `GratitudeSection.swift`**

Create `moodtracker+/Views/Today/GratitudeSection.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct GratitudeSection: View {
    @Binding var gratitude: String

    var body: some View {
        Section("Gratitude") {
            TextField(
                "What are you grateful for?",
                text: $gratitude,
                axis: .vertical
            )
            .lineLimit(3...6)
        }
    }
}
```

- [ ] **Step 8: Create `TodayView.swift`**

Create `moodtracker+/Views/Today/TodayView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct TodayView: View {
    @State private var viewModel: TodayViewModel
    @Environment(AuthViewModel.self) private var auth
    private let date: String

    init(date: String = DateFormatter.isoDate.string(from: Date())) {
        self.date = date
        _viewModel = State(wrappedValue: TodayViewModel(date: date))
    }

    var body: some View {
        let isToday = date == DateFormatter.isoDate.string(from: Date())

        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                @Bindable var vm = viewModel
                Form {
                    MoodSection(
                        moodRating: $vm.moodRating,
                        moodEnergy: $vm.moodEnergy,
                        moodAnxiety: $vm.moodAnxiety
                    )
                    FoodSection(mealsCount: $vm.mealsCount)
                    ExerciseSection(exercised: $vm.exercised)
                    SleepSection(
                        wakeTime: $vm.wakeTime,
                        sleepQuality: $vm.sleepQuality,
                        tonightBedtime: $vm.tonightBedtime
                    )
                    GratitudeSection(gratitude: $vm.gratitude)

                    Section {
                        if let error = viewModel.saveError {
                            Text(error).foregroundStyle(.red).font(.caption)
                        }
                        Button {
                            Task { await viewModel.save() }
                        } label: {
                            Group {
                                if viewModel.isSaving {
                                    ProgressView()
                                } else if viewModel.saved {
                                    Label("Saved", systemImage: "checkmark")
                                } else {
                                    Text("Save")
                                }
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .disabled(viewModel.isSaving)
                    }
                }
            }
        }
        .navigationTitle(isToday ? "Today" : date)
        .toolbar {
            if isToday {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Sign Out") {
                        Task { await auth.signOut() }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 9: Update `MainTabView.swift` to use `TodayView`**

Replace the Today placeholder in `MainTabView.swift`:

```swift
import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            NavigationStack {
                TodayView()
            }
            .tabItem { Label("Today", systemImage: "calendar") }

            NavigationStack {
                HistoryView()
            }
            .tabItem { Label("History", systemImage: "list.bullet") }

            NavigationStack {
                Text("Charts — coming in Task 7")
                    .navigationTitle("Charts")
            }
            .tabItem { Label("Charts", systemImage: "chart.line.uptrend.xyaxis") }
        }
    }
}
```

- [ ] **Step 10: Build and run manually**

⌘R on a simulator. After signing in:
- Today tab shows the full form with Mood sliders, Food stepper, Exercise toggle, Sleep section, Gratitude field
- Setting values and tapping Save briefly shows "Saved ✓"
- Reopening the app restores saved values
- Sign Out button in the nav bar signs out and returns to Sign In

- [ ] **Step 11: Commit**

```bash
git add moodtracker+/Views/Shared/ \
        moodtracker+/ViewModels/TodayViewModel.swift \
        moodtracker+/Views/Today/ \
        moodtracker+/Views/Layout/MainTabView.swift \
        moodtracker+.xcodeproj
git commit -m "feat: Today screen — TodayViewModel, form sections, save/load"
```

---

### Task 6: History Screen

**Files:**
- Create: `moodtracker+/ViewModels/HistoryViewModel.swift`
- Create: `moodtracker+/Views/History/HistoryEntryView.swift`
- Create: `moodtracker+/Views/History/HistoryView.swift`

**Interfaces:**
- Consumes: `DailyLog`, `DateFormatter.isoDate`, `SupabaseClient.shared`, `TodayView` (Task 5)
- Produces:
  - `@Observable final class HistoryViewModel` — `logs: [DailyLog]`, `isLoading: Bool`, `error: String?`
  - `HistoryView` — tapping a row pushes `TodayView(date: log.date)`

- [ ] **Step 1: Create `HistoryViewModel.swift`**

Create `moodtracker+/ViewModels/HistoryViewModel.swift`, add to `moodtracker+` target:

```swift
import Foundation
import Observation

@Observable
final class HistoryViewModel {
    private(set) var logs: [DailyLog] = []
    private(set) var isLoading = true
    private(set) var error: String?

    init() {
        Task { await load() }
    }

    private func load() async {
        isLoading = true
        error = nil
        let toDate = DateFormatter.isoDate.string(from: Date())
        let fromDate = DateFormatter.isoDate.string(
            from: Calendar.current.date(byAdding: .day, value: -90, to: Date()) ?? Date()
        )
        do {
            let result: [DailyLog] = try await SupabaseClient.shared
                .from("daily_logs")
                .select()
                .gte("date", value: fromDate)
                .lte("date", value: toDate)
                .order("date", ascending: false)
                .execute()
                .value
            logs = result
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
```

- [ ] **Step 2: Create `HistoryEntryView.swift`**

Create `moodtracker+/Views/History/HistoryEntryView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct HistoryEntryView: View {
    let log: DailyLog

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(log.date)
                .font(.subheadline.bold())

            HStack(spacing: 10) {
                if let v = log.moodRating  { Text("Mood \(v)/10") }
                if let v = log.moodEnergy  { Text("Energy \(v)/10") }
                if let v = log.moodAnxiety { Text("Anxiety \(v)/10") }
                if let v = log.sleepHours  { Text(String(format: "Sleep %.1fh", v)) }
                if let v = log.mealsCount  { Text("\(v) meals") }
            }
            .font(.caption)
            .foregroundStyle(.secondary)

            if let ex = log.exercised {
                Text(ex ? "✓ Exercised" : "✗ No exercise")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let g = log.gratitude, !g.isEmpty {
                Text(""\(g.count > 80 ? String(g.prefix(80)) + "…" : g)"")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .italic()
            }
        }
        .padding(.vertical, 2)
    }
}
```

- [ ] **Step 3: Create `HistoryView.swift`**

Create `moodtracker+/Views/History/HistoryView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct HistoryView: View {
    @State private var viewModel = HistoryViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.error {
                ContentUnavailableView(
                    "Error loading history",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if viewModel.logs.isEmpty {
                ContentUnavailableView(
                    "No entries yet",
                    systemImage: "calendar.badge.plus",
                    description: Text("Log your first day on the Today tab.")
                )
            } else {
                List(viewModel.logs) { log in
                    NavigationLink(destination: TodayView(date: log.date)) {
                        HistoryEntryView(log: log)
                    }
                }
            }
        }
        .navigationTitle("History")
    }
}
```

- [ ] **Step 4: Build and run manually**

⌘R. After having at least one saved log:
- History tab shows a list of entries, newest-first
- Each row shows date, mood/energy/anxiety, sleep hours, meals count, exercise, gratitude snippet
- Tapping a row navigates to `TodayView` for that date with existing values loaded

- [ ] **Step 5: Commit**

```bash
git add moodtracker+/ViewModels/HistoryViewModel.swift \
        moodtracker+/Views/History/ \
        moodtracker+.xcodeproj
git commit -m "feat: History screen — HistoryViewModel, entry list, tap to edit past date"
```

---

### Task 7: Charts Screen

**Files:**
- Create: `moodtracker+/ViewModels/ChartsViewModel.swift`
- Create: `moodtracker+/Views/Charts/ChartCard.swift`
- Create: `moodtracker+/Views/Charts/MoodChartView.swift`
- Create: `moodtracker+/Views/Charts/SleepChartView.swift`
- Create: `moodtracker+/Views/Charts/MealsChartView.swift`
- Create: `moodtracker+/Views/Charts/ExerciseChartView.swift`
- Create: `moodtracker+/Views/Charts/ChartsView.swift`
- Modify: `moodtracker+/Views/Layout/MainTabView.swift` (replace Charts placeholder)

**Interfaces:**
- Consumes: `DailyLog`, `DateFormatter.isoDate`, `String.asLogDate`, `SupabaseClient.shared`
- Produces: `ChartsView` with four line/bar charts and a 7/30/90-day range picker

- [ ] **Step 1: Create `ChartsViewModel.swift`**

Create `moodtracker+/ViewModels/ChartsViewModel.swift`, add to `moodtracker+` target:

```swift
import Foundation
import Observation

@Observable
final class ChartsViewModel {
    var rangeDays: Int = 30 {
        didSet { Task { await load() } }
    }
    private(set) var chronologicalLogs: [DailyLog] = []
    private(set) var isLoading = true

    init() {
        Task { await load() }
    }

    private func load() async {
        isLoading = true
        let toDate = DateFormatter.isoDate.string(from: Date())
        let fromDate = DateFormatter.isoDate.string(
            from: Calendar.current.date(byAdding: .day, value: -rangeDays, to: Date()) ?? Date()
        )
        chronologicalLogs = (try? await SupabaseClient.shared
            .from("daily_logs")
            .select()
            .gte("date", value: fromDate)
            .lte("date", value: toDate)
            .order("date", ascending: true)
            .execute()
            .value) ?? []
        isLoading = false
    }
}
```

- [ ] **Step 2: Create `ChartCard.swift`**

Create `moodtracker+/Views/Charts/ChartCard.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct ChartCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline.bold())
                .padding(.horizontal)
            content()
                .frame(height: 200)
                .padding(.horizontal)
        }
        .padding(.vertical)
        .background(.background.secondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}
```

- [ ] **Step 3: Create `MoodChartView.swift`**

Create `moodtracker+/Views/Charts/MoodChartView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI
import Charts

struct MoodChartView: View {
    let logs: [DailyLog]

    private struct Point: Identifiable {
        let id = UUID()
        let date: Date
        let series: String
        let value: Int
    }

    private var data: [Point] {
        logs.flatMap { log -> [Point] in
            guard let date = log.date.asLogDate else { return [] }
            var pts: [Point] = []
            if let v = log.moodRating  { pts.append(.init(date: date, series: "Mood",    value: v)) }
            if let v = log.moodEnergy  { pts.append(.init(date: date, series: "Energy",  value: v)) }
            if let v = log.moodAnxiety { pts.append(.init(date: date, series: "Anxiety", value: v)) }
            return pts
        }
    }

    var body: some View {
        ChartCard(title: "Mood / Energy / Anxiety") {
            Chart(data) { pt in
                LineMark(
                    x: .value("Date", pt.date),
                    y: .value("Value", pt.value)
                )
                .foregroundStyle(by: .value("Series", pt.series))
            }
            .chartYScale(domain: 1...10)
            .chartXAxis {
                AxisMarks(values: .automatic) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                }
            }
        }
    }
}
```

- [ ] **Step 4: Create `SleepChartView.swift`**

Create `moodtracker+/Views/Charts/SleepChartView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI
import Charts

// Quality (1–5) is scaled ×2.4 to share the Hours (0–12) axis.
// The legend label shows the original scale.
struct SleepChartView: View {
    let logs: [DailyLog]

    private struct Point: Identifiable {
        let id = UUID()
        let date: Date
        let series: String
        let value: Double
    }

    private var data: [Point] {
        logs.flatMap { log -> [Point] in
            guard let date = log.date.asLogDate else { return [] }
            var pts: [Point] = []
            if let v = log.sleepHours   { pts.append(.init(date: date, series: "Hours (0–12)",   value: v)) }
            if let v = log.sleepQuality { pts.append(.init(date: date, series: "Quality (1–5)", value: Double(v) * 2.4)) }
            return pts
        }
    }

    var body: some View {
        ChartCard(title: "Sleep") {
            Chart(data) { pt in
                LineMark(
                    x: .value("Date", pt.date),
                    y: .value("Value", pt.value)
                )
                .foregroundStyle(by: .value("Series", pt.series))
            }
            .chartYScale(domain: 0...12)
            .chartXAxis {
                AxisMarks(values: .automatic) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                }
            }
        }
    }
}
```

- [ ] **Step 5: Create `MealsChartView.swift`**

Create `moodtracker+/Views/Charts/MealsChartView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI
import Charts

struct MealsChartView: View {
    let logs: [DailyLog]

    private struct Point: Identifiable {
        let id = UUID()
        let date: Date
        let count: Int
    }

    private var data: [Point] {
        logs.compactMap { log in
            guard let date = log.date.asLogDate, let count = log.mealsCount else { return nil }
            return Point(date: date, count: count)
        }
    }

    var body: some View {
        ChartCard(title: "Meals") {
            Chart(data) { pt in
                BarMark(
                    x: .value("Date", pt.date, unit: .day),
                    y: .value("Meals", pt.count)
                )
                .foregroundStyle(.orange)
            }
            .chartXAxis {
                AxisMarks(values: .automatic) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                }
            }
        }
    }
}
```

- [ ] **Step 6: Create `ExerciseChartView.swift`**

Create `moodtracker+/Views/Charts/ExerciseChartView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI
import Charts

struct ExerciseChartView: View {
    let logs: [DailyLog]

    private struct Point: Identifiable {
        let id = UUID()
        let date: Date
        let exercised: Bool
    }

    private var data: [Point] {
        logs.compactMap { log in
            guard let date = log.date.asLogDate, let ex = log.exercised else { return nil }
            return Point(date: date, exercised: ex)
        }
    }

    var body: some View {
        ChartCard(title: "Exercise") {
            Chart(data) { pt in
                BarMark(
                    x: .value("Date", pt.date, unit: .day),
                    y: .value("", 1)
                )
                .foregroundStyle(pt.exercised ? Color.blue : Color.gray.opacity(0.3))
            }
            .chartYAxis(.hidden)
            .chartXAxis {
                AxisMarks(values: .automatic) { _ in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                }
            }
        }
    }
}
```

- [ ] **Step 7: Create `ChartsView.swift`**

Create `moodtracker+/Views/Charts/ChartsView.swift`, add to `moodtracker+` target:

```swift
import SwiftUI

struct ChartsView: View {
    @State private var viewModel = ChartsViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Picker("Range", selection: $viewModel.rangeDays) {
                    Text("7 days").tag(7)
                    Text("30 days").tag(30)
                    Text("90 days").tag(90)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                if viewModel.isLoading {
                    ProgressView().padding(.top, 40)
                } else if viewModel.chronologicalLogs.isEmpty {
                    ContentUnavailableView(
                        "No entries",
                        systemImage: "chart.line.downtrend.xyaxis",
                        description: Text("No logs for this period.")
                    )
                    .padding(.top, 40)
                } else {
                    MoodChartView(logs: viewModel.chronologicalLogs)
                    SleepChartView(logs: viewModel.chronologicalLogs)
                    MealsChartView(logs: viewModel.chronologicalLogs)
                    ExerciseChartView(logs: viewModel.chronologicalLogs)
                }
            }
            .padding(.vertical)
        }
        .navigationTitle("Charts")
    }
}
```

- [ ] **Step 8: Update `MainTabView.swift` to use `ChartsView`**

Replace the Charts placeholder:

```swift
import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            NavigationStack {
                TodayView()
            }
            .tabItem { Label("Today", systemImage: "calendar") }

            NavigationStack {
                HistoryView()
            }
            .tabItem { Label("History", systemImage: "list.bullet") }

            NavigationStack {
                ChartsView()
            }
            .tabItem { Label("Charts", systemImage: "chart.line.uptrend.xyaxis") }
        }
    }
}
```

- [ ] **Step 9: Build and run manually**

⌘R. After having several saved logs:
- Charts tab shows the segmented 7/30/90 picker
- Switching ranges refetches and re-renders all four charts
- Mood chart shows three colored lines for mood, energy, anxiety
- Sleep chart shows two scaled lines for hours and quality (with legend)
- Meals chart shows orange bars per day
- Exercise chart shows blue (exercised) and gray (not exercised) bars

- [ ] **Step 10: Set Supabase redirect URL**

In the Supabase dashboard → Authentication → URL Configuration, add `moodtracker://login-callback` to the **Redirect URLs** list. This enables password reset and email verification deep links to open the app.

- [ ] **Step 11: Final commit**

```bash
git add moodtracker+/ViewModels/ChartsViewModel.swift \
        moodtracker+/Views/Charts/ \
        moodtracker+/Views/Layout/MainTabView.swift \
        moodtracker+.xcodeproj
git commit -m "feat: Charts screen — ChartsViewModel, 4 Swift Charts, range picker"
```
