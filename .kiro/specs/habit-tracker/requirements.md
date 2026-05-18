# Requirements Document

## Introduction

A full stack web application for tracking daily and weekly habits, measuring consistency through streaks and metrics, and visualizing progress over time. The application enables users to create, manage, and monitor personal habits with the goal of building long-term consistency. It includes user authentication, a responsive dashboard, and persistent data storage.

## Glossary

- **Application**: The habit tracking and consistency full stack web application
- **User**: An authenticated individual who creates and tracks habits within the Application
- **Habit**: A recurring activity that a User wants to perform on a defined schedule (daily or weekly)
- **Completion**: A recorded instance of a User performing a Habit on a specific date
- **Streak**: The count of consecutive scheduled periods in which a User has completed a Habit without missing
- **Schedule**: The frequency configuration for a Habit, either daily or weekly with specific days selected
- **Dashboard**: The main interface displaying a User's habits, streaks, and progress visualizations
- **Authentication_Service**: The component responsible for user registration, login, and session management
- **Habit_Service**: The backend component responsible for habit CRUD operations and completion tracking
- **Analytics_Engine**: The component responsible for calculating streaks, consistency rates, and progress metrics

## Requirements

### Requirement 1: User Registration

**User Story:** As a new visitor, I want to create an account, so that I can securely store and access my habit data.

#### Acceptance Criteria

1. WHEN a visitor provides a valid email and password, THE Authentication_Service SHALL create a new User account and return an authentication token
2. IF the registration request contains an email that is already registered (compared case-insensitively), THEN THE Authentication_Service SHALL reject the registration and return an error message indicating that the email is already in use
3. THE Authentication_Service SHALL require passwords to be between 8 and 128 characters long and contain at least one uppercase letter, one lowercase letter, and one number
4. IF the registration request contains an invalid email format, THEN THE Authentication_Service SHALL reject the request and return a validation error indicating the email format is invalid
5. IF the registration request contains a password that does not meet the requirements defined in criterion 3, THEN THE Authentication_Service SHALL reject the request and return a validation error indicating which password rule was not satisfied
6. IF the Authentication_Service cannot complete the registration due to a service failure, THEN THE Authentication_Service SHALL return an error message indicating the registration could not be processed and SHALL NOT create a partial User account

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in to my account, so that I can access my habits and progress data.

#### Acceptance Criteria

1. WHEN a User provides a valid registered email and matching password, THE Authentication_Service SHALL return an authentication token and grant access to the Dashboard
2. WHEN a User provides an unregistered email or incorrect password, THE Authentication_Service SHALL reject the login attempt and return a generic authentication error without indicating which credential was incorrect
3. THE Authentication_Service SHALL issue tokens that expire after 24 hours without an authenticated API request from the token holder
4. WHEN a User's token expires, THE Authentication_Service SHALL reject subsequent API requests with that token and require the User to re-authenticate by providing credentials again
5. IF a User fails login 5 consecutive times for the same email, THEN THE Authentication_Service SHALL lock the account for 15 minutes and reject further login attempts for that email until the lockout period elapses

### Requirement 3: User Logout

**User Story:** As a logged-in user, I want to log out of my account, so that I can secure my session on shared devices.

#### Acceptance Criteria

1. WHEN a User requests logout, THE Authentication_Service SHALL invalidate the current authentication token within 1 second
2. WHEN a User's token has been invalidated, THE Application SHALL clear any locally stored authentication data and redirect the User to the login page
3. IF the logout request fails due to a network or server error, THEN THE Application SHALL display an error message indicating the logout was unsuccessful and retain the User on the current page

### Requirement 4: Habit Creation

**User Story:** As a user, I want to create new habits with a defined schedule, so that I can begin tracking my consistency.

#### Acceptance Criteria

1. WHEN a User submits a valid habit name and schedule, THE Habit_Service SHALL create a new Habit associated with that User
2. THE Habit_Service SHALL support daily schedules and weekly schedules with at least 1 and up to 7 specific days selected
3. THE Habit_Service SHALL require a habit name between 1 and 100 characters after trimming leading and trailing whitespace
4. IF a User submits a habit without a name or with a name that is empty after trimming whitespace, THEN THE Habit_Service SHALL reject the request and return a validation error indicating the name is required
5. WHEN a Habit is created, THE Habit_Service SHALL record the creation date and set the initial streak to zero
6. IF a User submits a habit without a schedule or with a weekly schedule that has no days selected, THEN THE Habit_Service SHALL reject the request and return a validation error indicating a valid schedule is required

### Requirement 5: Habit Editing

**User Story:** As a user, I want to edit my existing habits, so that I can adjust names or schedules as my goals evolve.

#### Acceptance Criteria

1. WHEN a User submits updated habit details with a valid name and schedule, THE Habit_Service SHALL update the Habit record with the new values and return the updated Habit
2. WHEN a User changes a Habit's schedule, THE Habit_Service SHALL preserve existing Completion records and trigger a Streak recalculation by the Analytics_Engine based on the new schedule
3. IF a User attempts to edit a Habit that does not belong to that User, THEN THE Habit_Service SHALL reject the request and return an authorization error
4. IF a User submits an edit with a name that is empty or exceeds 100 characters or with an invalid schedule, THEN THE Habit_Service SHALL reject the request and return a validation error indicating the invalid fields
5. THE Habit_Service SHALL enforce the same validation rules for editing a Habit as for creating a Habit, requiring a name between 1 and 100 characters and a valid daily or weekly schedule

### Requirement 6: Habit Deletion

**User Story:** As a user, I want to delete habits I no longer want to track, so that my dashboard remains relevant.

#### Acceptance Criteria

1. WHEN a User confirms deletion of a Habit, THE Habit_Service SHALL permanently remove the Habit and all associated Completion records from the database
2. IF a User attempts to delete a Habit that does not belong to that User, THEN THE Habit_Service SHALL reject the request and return an authorization error without modifying any data
3. WHEN a User requests deletion of a Habit, THE Application SHALL display a confirmation prompt indicating that the Habit and all associated Completion records will be permanently removed
4. WHEN a User confirms deletion, THE Application SHALL remove the Habit from the Dashboard within 1 second of receiving a successful response from the Habit_Service
5. IF a User attempts to delete a Habit that does not exist, THEN THE Habit_Service SHALL return an error indicating the Habit was not found

### Requirement 7: Habit Completion Tracking

**User Story:** As a user, I want to mark habits as complete for a given day, so that I can record my progress.

#### Acceptance Criteria

1. WHEN a User marks a Habit as complete for a date, THE Habit_Service SHALL create a Completion record for that Habit and date
2. WHEN a User unmarks a Habit completion, THE Habit_Service SHALL remove the Completion record for that Habit and date
3. IF a User attempts to create a Completion record that already exists for the same Habit and date combination, THEN THE Habit_Service SHALL reject the request and return an error message indicating the duplicate
4. IF a User attempts to record a Completion for a date that is in the future or more than 7 days in the past, THEN THE Habit_Service SHALL reject the request and return an error message indicating the date is outside the allowed range
5. THE Habit_Service SHALL only allow a User to create or remove Completions for Habits that belong to that User
6. IF a User attempts to unmark a Completion that does not exist, THEN THE Habit_Service SHALL reject the request and return an error message indicating no Completion was found

### Requirement 8: Streak Calculation

**User Story:** As a user, I want to see my current streak for each habit, so that I can stay motivated by my consistency.

#### Acceptance Criteria

1. WHEN a Completion is recorded or removed, THE Analytics_Engine SHALL recalculate the current Streak for that Habit within 1 second
2. THE Analytics_Engine SHALL calculate a Streak as the number of consecutive scheduled periods with at least one Completion, where a scheduled period is each calendar day for daily Habits and each selected day of the week for weekly Habits
3. WHEN the Analytics_Engine recalculates a Streak and detects that the most recent scheduled period prior to today has no Completion record, THE Analytics_Engine SHALL reset the current Streak to zero
4. THE Analytics_Engine SHALL track and display both the current Streak and the longest Streak for each Habit
5. WHEN the current Streak exceeds the stored longest Streak, THE Analytics_Engine SHALL update the longest Streak to equal the current Streak

### Requirement 9: Consistency Metrics

**User Story:** As a user, I want to see my overall consistency rate, so that I can understand my long-term adherence to habits.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL calculate a consistency rate as the percentage of scheduled periods with at least one Completion divided by total scheduled periods since Habit creation, rounded to one decimal place
2. THE Analytics_Engine SHALL calculate consistency rates for the last 7 days, last 30 days, and all time, where each time window includes the current day and counts backward
3. IF a Habit has existed for fewer days than a selected time window, THEN THE Analytics_Engine SHALL calculate the consistency rate using only the scheduled periods since the Habit's creation date
4. WHEN a User views a Habit's details, THE Application SHALL display the consistency rate as a percentage for each time period (last 7 days, last 30 days, and all time)
5. IF a Habit has zero scheduled periods within a time window, THEN THE Analytics_Engine SHALL report the consistency rate as 0% for that time window

### Requirement 10: Dashboard Overview

**User Story:** As a user, I want a dashboard showing all my habits and today's status, so that I can quickly see what I need to do.

#### Acceptance Criteria

1. WHEN a User accesses the Dashboard, THE Application SHALL display all of the User's Habits along with each Habit's completion status for the current day, showing Habits that are scheduled for today as incomplete or completed and Habits not scheduled for today as not applicable
2. THE Dashboard SHALL display the current Streak as a numeric value for each Habit
3. THE Dashboard SHALL visually distinguish between completed and incomplete Habits for the current day using at least one distinct visual indicator such as a different color, icon, or style
4. WHEN a User completes all Habits scheduled for the current day, THE Dashboard SHALL display a completion indicator confirming that no scheduled Habits remain incomplete
5. WHEN a User marks or unmarks a Habit completion from the Dashboard, THE Application SHALL update the Dashboard to reflect the new completion status, streak value, and completion indicator state without requiring a full page reload
6. IF a User has no Habits created, THEN THE Dashboard SHALL display an empty state message prompting the User to create their first Habit

### Requirement 11: Progress Visualization

**User Story:** As a user, I want to see visual charts of my habit progress over time, so that I can identify patterns and stay motivated.

#### Acceptance Criteria

1. THE Application SHALL display a calendar heatmap showing Completion density for each Habit over the past 12 months, where density is represented as the percentage of scheduled completions fulfilled per day, grouped into 5 levels: 0%, 1-25%, 26-50%, 51-75%, and 76-100%
2. THE Application SHALL display a weekly summary chart showing the number of Habits completed per day for the current week, defined as Monday through Sunday
3. WHEN a User selects a specific Habit, THE Application SHALL display a line chart of the consistency rate calculated at weekly intervals over the past 12 weeks
4. IF a Habit has fewer than 7 days of history, THEN THE Application SHALL display a message indicating that insufficient data is available for chart rendering and SHALL not display the chart for that Habit

### Requirement 12: Responsive User Interface

**User Story:** As a user, I want to access the application on both desktop and mobile devices, so that I can track habits from anywhere.

#### Acceptance Criteria

1. THE Application SHALL render all content without horizontal scrolling, without overlapping elements, and without text truncation on screen widths from 320px to 2560px
2. WHILE the screen width is below 768px, THE Application SHALL provide touch-friendly interaction targets of at least 44x44 pixels for all buttons, links, and interactive controls
3. WHILE the screen width is below 768px, THE Application SHALL display a single-column layout with a bottom navigation bar providing access to all primary sections
4. WHILE the screen width is 768px or above, THE Application SHALL display a multi-column layout with a side or top navigation bar
5. WHEN the device orientation changes, THE Application SHALL reflow content to fit the new viewport width within 1 second without requiring a page reload

### Requirement 13: Data Persistence

**User Story:** As a user, I want my habit data to be reliably stored, so that I never lose my tracking history.

#### Acceptance Criteria

1. THE Application SHALL persist all User, Habit, and Completion data in a database such that all committed data survives application restarts
2. WHEN a User creates, updates, or deletes data, THE Application SHALL receive a success response from the database within 10 seconds before updating the interface
3. IF a database operation fails, THEN THE Application SHALL display an error message indicating the type of operation that failed and preserve the data displayed in the interface prior to the failed operation without discarding any user input
4. THE Application SHALL enforce referential integrity such that every Habit references a valid User and every Completion references a valid Habit
5. IF a database operation does not complete within 10 seconds, THEN THE Application SHALL treat the operation as failed and display a timeout error message to the User

### Requirement 14: API Security

**User Story:** As a user, I want my data to be protected, so that only I can access my habit information.

#### Acceptance Criteria

1. THE Application SHALL require a valid authentication token for all API endpoints except registration and login
2. IF a request is made with a missing, malformed, or expired token, THEN THE Application SHALL return a 401 Unauthorized response and not process the request
3. IF a User attempts to access or modify data belonging to another User, THEN THE Application SHALL return a 403 Forbidden response and not perform the operation
4. THE Application SHALL hash all passwords using a one-way hashing algorithm with a unique salt per password before storing them in the database
5. THE Application SHALL never include password hashes in API responses
