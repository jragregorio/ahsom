# Simple Order Setup

This storefront now supports an order-request workflow:

1. Customer adds seafood items to the cart.
2. Customer fills out the order form.
3. The website sends the order to a Google Apps Script web app.
4. The Apps Script writes the order into a Google Sheet.
5. Your wife reviews the sheet and confirms the final total manually.

## Files Included

- `index.html`
  Customer-facing storefront and order form.
- `google-apps-script/Code.gs`
  Google Apps Script endpoint that saves each order to a sheet named `Orders`.

## One-Time Setup

1. Create a new Google Sheet for orders.
2. Open `Extensions` -> `Apps Script`.
3. Replace the default script with the contents of `google-apps-script/Code.gs`.
4. Save the script project.
5. Deploy it as a web app:
   - `Deploy` -> `New deployment`
   - Type: `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone`
6. Copy the web app URL.
7. Open `index.html`.
8. Find this line in the script section:

```html
const ORDER_ENDPOINT = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

9. Replace the placeholder with the real web app URL.

## Recommended Sheet Workflow

Use these columns exactly as the script creates them:

- `Order ID`
- `Timestamp`
- `Status`
- `Customer Name`
- `Mobile Number`
- `Fulfillment Type`
- `Address Or Meetup Note`
- `Additional Notes`
- `Items Summary`
- `Items JSON`
- `Total Items`
- `Subtotal`
- `Currency`
- `Submitted At ISO`

For day-to-day use, your wife only really needs to pay attention to:

- `Order ID`
- `Status`
- `Customer Name`
- `Mobile Number`
- `Items Summary`
- `Subtotal`
- `Address Or Meetup Note`

## Suggested Statuses

Keep it simple:

- `New`
- `Confirmed`
- `Preparing`
- `Delivered`
- `Cancelled`

## Best Practice For This Business

Treat the website total as an estimate. After receiving the order:

1. Check the order in Google Sheets.
2. Message or call the customer.
3. Confirm availability, final weight, delivery fee, and final amount.
4. Update the `Status` column.
5. Collect payment manually through your preferred method.

## Existing Sheet Upgrade

If your `Orders` sheet already has rows, the updated script will:

- insert a new `Order ID` column automatically
- backfill older rows with IDs like `AHSOM-0001`
- assign the next ID automatically to future orders

## Important Note

The current website does not process online payments. It only captures order requests and sends them to the sheet for manual follow-up.
