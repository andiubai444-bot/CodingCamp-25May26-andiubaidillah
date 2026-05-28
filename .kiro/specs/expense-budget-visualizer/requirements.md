# Requirements Document

## Introduction

The Expense & Budget Visualizer is a standalone client-side web application that allows users to track personal expenses, set category budgets, and visualize spending patterns through charts and summaries. All data is persisted in the browser's LocalStorage. The app requires no backend, no account creation, and no installation — it runs directly in any modern browser from a single HTML file.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Expense**: A single spending record consisting of an amount, category, date, and optional description.
- **Budget**: A user-defined monthly spending limit assigned to a specific category.
- **Category**: A label used to group expenses (e.g., Food, Transport, Entertainment).
- **Summary**: An aggregated view of total spending and remaining budget for a given period.
- **Chart**: A visual representation (bar or pie) of expense data rendered in the browser.
- **LocalStorage**: The browser's built-in key-value storage API used to persist all app data client-side.
- **Storage_Manager**: The module responsible for reading and writing data to LocalStorage.
- **Expense_Form**: The UI component that accepts user input for adding or editing an expense.
- **Budget_Form**: The UI component that accepts user input for setting a category budget.
- **Dashboard**: The main view displaying the summary, charts, and recent expense list.
- **Expense_List**: The UI component that displays all recorded expenses with filter and sort controls.

---

## Requirements

### Requirement 1: Add Expense

**User Story:** As a user, I want to add an expense with an amount, category, date, and description, so that I can record my spending.

#### Acceptance Criteria

1. THE Expense_Form SHALL include a numeric amount field (positive numbers only, up to 2 decimal places), a category selector, a date field (YYYY-MM-DD format), and an optional description text field (max 255 characters).
2. WHEN the user submits the Expense_Form with valid data, THE App SHALL save the expense to LocalStorage, update the Dashboard without a page reload, and reset the Expense_Form to its default empty state.
3. IF the user submits the Expense_Form with an empty or non-positive amount, THEN THE Expense_Form SHALL display an inline validation error adjacent to the amount field and prevent saving.
4. IF the user submits the Expense_Form with no category selected, THEN THE Expense_Form SHALL display an inline validation error adjacent to the category field and prevent saving.
5. WHEN the Expense_Form is rendered with no date value, THE Expense_Form SHALL pre-populate the date field with the current day regardless of the validity of other fields.
6. IF the user submits the Expense_Form with no date value, THEN THE Expense_Form SHALL display an inline validation error adjacent to the date field and prevent saving.

---

### Requirement 2: Edit and Delete Expense

**User Story:** As a user, I want to edit or delete an existing expense, so that I can correct mistakes or remove outdated records.

#### Acceptance Criteria

1. WHEN the user selects an expense from the Expense_List, THE App SHALL populate the Expense_Form with that expense's amount, category, date, and description fields for editing.
2. WHEN the user saves an edited expense with valid data, THE App SHALL update the existing record in LocalStorage, refresh the Dashboard, and reset the Expense_Form to its default empty state as a single atomic operation.
3. IF the Dashboard refresh fails after a LocalStorage update during an edit save, THEN THE App SHALL roll back the LocalStorage update and display an error message.
4. WHEN the user deletes an expense and confirms the deletion, THE App SHALL remove the record from LocalStorage and refresh the Dashboard.
5. IF the user attempts to delete an expense, THEN THE App SHALL display a confirmation prompt; IF the user cancels, THEN THE App SHALL dismiss the prompt and take no further action.
6. WHEN the user saves an edited expense, THE App SHALL apply the same validation rules as adding a new expense (non-positive amount, missing category, missing date each produce inline errors and prevent saving).

---

### Requirement 3: Manage Categories

**User Story:** As a user, I want to create and manage expense categories, so that I can organize my spending in a way that fits my lifestyle.

#### Acceptance Criteria

1. WHEN the App is loaded and LocalStorage contains no category data, THE App SHALL pre-load the following default categories: Food, Transport, Housing, Entertainment, Health, and Other.
2. WHEN the user creates a new category, THE App SHALL trim leading and trailing whitespace from the name, validate that the trimmed name is between 1 and 50 characters, add it to the category list in LocalStorage, and make it available in the Expense_Form and Budget_Form.
3. IF the user attempts to create a category whose trimmed name matches an existing category name (case-insensitive), THEN THE App SHALL display an inline validation error and prevent the duplicate from being saved.
4. WHEN the user deletes a category, THE App SHALL retain all existing expenses that reference that category, mark them with a "Deleted Category" label, and remove the associated budget for that category from LocalStorage.
5. IF the user attempts to delete one of the six default categories (Food, Transport, Housing, Entertainment, Health, Other), THEN THE App SHALL display an inline error message and prevent the deletion.

---

### Requirement 4: Set Category Budgets

**User Story:** As a user, I want to set a monthly budget for each category, so that I can control how much I spend in each area.

#### Acceptance Criteria

1. THE Budget_Form SHALL allow the user to assign a positive numeric monthly budget limit (up to 2 decimal places, maximum 999,999,999.99) to any category; if a budget already exists for that category, saving SHALL overwrite the existing value.
2. WHEN the user saves a budget with a valid amount and a selected category, THE App SHALL store the budget in LocalStorage and reflect it in the Dashboard summary without a page reload.
3. IF the user saves the Budget_Form with no category selected, THEN THE Budget_Form SHALL display an inline validation error adjacent to the category field and prevent saving.
4. IF the user sets a budget amount that is zero or negative, THEN THE Budget_Form SHALL display an inline validation error adjacent to the amount field and prevent saving, independent of any other field validation state.
5. WHERE a budget has been set for a category, THE Dashboard SHALL display the spent amount, the budget limit, and the remaining balance for that category; IF spending exceeds the budget, THE Dashboard SHALL display the remaining balance as a negative value.

---

### Requirement 5: Dashboard Summary

**User Story:** As a user, I want to see a summary of my total spending and budget status at a glance, so that I can quickly understand my financial situation.

#### Acceptance Criteria

1. THE Dashboard SHALL display the total amount spent in the current calendar month.
2. THE Dashboard SHALL display the total budget across all categories that have a budget set.
3. WHEN total spending in a category exceeds its budget, THE Dashboard SHALL render that category's summary row with a visually distinct style (e.g., different background or text color) and include a dedicated over-budget indicator element, distinguishable from non-over-budget rows.
4. IF a category has no budget set and has any recorded spending in the current month, THEN THE Dashboard SHALL display an over-budget indicator for that category's summary row.
5. WHEN any expense or budget is created, updated, or deleted, THE Dashboard SHALL update all summary values within 1 second without requiring a page reload.

---

### Requirement 6: Expense Visualization (Charts)

**User Story:** As a user, I want to see charts of my spending by category and over time, so that I can identify patterns and make better financial decisions.

#### Acceptance Criteria

1. THE Dashboard SHALL display a pie chart showing the proportion of total spending per category for the current month, excluding categories with zero spending.
2. THE Dashboard SHALL display a bar chart showing total spending per day for the current month, with the x-axis spanning all days from day 1 to the last day of the current month; THE Dashboard SHALL provide a toggle control allowing the user to switch the bar chart granularity between "daily" (default) and "weekly" views.
3. WHEN there are no expenses recorded for the current month, THE Dashboard SHALL hide all chart elements and display an empty-state message in their place.
4. THE Chart SHALL render using only browser-native Canvas or SVG APIs, with no external charting library required.
5. WHEN any expense is created, updated, or deleted, THE Dashboard SHALL update both charts to reflect the change without a page reload.

---

### Requirement 7: Filter and Sort Expenses

**User Story:** As a user, I want to filter and sort my expense list, so that I can find specific records and review spending by period or category.

#### Acceptance Criteria

1. THE Expense_List SHALL support filtering by category (single selection), by date range (start date and end date, inclusive), and by month (a preset date range shortcut); all active filters SHALL apply simultaneously to produce the displayed result set.
2. THE Expense_List SHALL support sorting by date (newest first, oldest first) and by amount (highest first, lowest first).
3. WHEN the user applies or changes any filter or sort control, THE Expense_List SHALL update to show the matching expenses within 300 ms, applying all active filters and the current sort order together.
4. WHEN no expenses match the active filter combination, THE Expense_List SHALL display an empty-state message.
5. WHEN the App is loaded, THE Expense_List SHALL display all expenses with no active filters and sorted by date newest first.
6. IF the user sets a date range filter where the start date is after the end date, THEN THE Expense_List SHALL display an inline validation error adjacent to the date range fields and retain the previously displayed results.

---

### Requirement 8: Data Persistence

**User Story:** As a user, I want my data to be saved automatically, so that my expenses and budgets are still available when I reopen the app.

#### Acceptance Criteria

1. WHEN the user creates, updates, or deletes an expense, budget, or category, THE Storage_Manager SHALL immediately write the updated expenses, budgets, and categories to LocalStorage before the operation is considered complete.
2. WHEN the App is loaded, THE Storage_Manager SHALL read all expenses, budgets, and categories from LocalStorage and render the Dashboard and Expense_List to reflect the stored data.
3. IF LocalStorage is unavailable or returns a parse error on load, THEN THE App SHALL display a non-blocking warning banner (the UI remains fully interactive without requiring the user to dismiss it) and operate with empty in-memory expenses, budgets, and categories for the session; all write operations SHALL be skipped for the duration of that session.

---

### Requirement 9: Export Data

**User Story:** As a user, I want to export my expense data, so that I can back it up or analyze it in another tool.

#### Acceptance Criteria

1. THE App SHALL provide an export action that generates a CSV file named `expenses.csv` containing all recorded expenses with columns: date, category, amount, description.
2. WHEN the user triggers the CSV export action and there are no recorded expenses, THE App SHALL display an informative message and not initiate a file download.
3. WHEN the user triggers the CSV export action and file generation succeeds, THE App SHALL initiate a browser file download of `expenses.csv` without requiring a server; IF the download initiation fails, THEN THE App SHALL display an error message and allow the user to re-trigger the export action.
4. THE App SHALL provide an export action that generates a JSON file named `expenses-budgets.json` containing all expenses (date, category, amount, description) and all budgets (category, limit).
5. WHEN the user triggers the JSON export action and file generation succeeds, THE App SHALL initiate a browser file download of `expenses-budgets.json` without requiring a server; IF the download initiation fails, THEN THE App SHALL display an error message and allow the user to re-trigger the export action.

---

### Requirement 10: Import Data

**User Story:** As a user, I want to import expense data from a file, so that I can restore a backup or migrate data from another tool.

#### Acceptance Criteria

1. WHEN the user selects a JSON file for import and the file matches the expected schema, THE App SHALL merge the imported records into LocalStorage by appending expenses and budgets whose combination of date, category, amount, and description does not already exist in LocalStorage, and skipping records that are exact duplicates.
2. IF the imported JSON file does not match the expected schema, THEN THE App SHALL display an error message indicating the reason the file was rejected, discard the import, and leave existing LocalStorage data unmodified.
3. WHEN a successful import completes, THE App SHALL refresh the Dashboard and Expense_List to reflect the newly imported data.
4. IF a LocalStorage write fails during import, THEN THE App SHALL roll back any partial changes, display an error message, and leave existing data in its pre-import state.
