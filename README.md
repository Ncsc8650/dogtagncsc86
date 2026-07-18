# NCSC86 Dog Tag Order

Web form for NCSC86 dog tag orders with a 3D preview, PNG front/back rendering, saved order list, and optional Google Sheets storage.

## Local Use

```bash
pnpm install
pnpm start
```

The local server runs on `http://localhost:4173` by default.

## Google Sheets

1. Open Google Apps Script and create a new project.
2. Paste the code from `scripts/google-apps-script.gs`.
3. Deploy it as a Web app.
4. Set `Execute as` to your account and `Who has access` to `Anyone with the link`.
5. Copy the Web app URL into `GOOGLE_SCRIPT_URL` in `app.js`.

Configured Google Sheet:

https://docs.google.com/spreadsheets/d/1bEdeom9G5LzamOw0Jm11Ko9ZwbUDggfJkWy5Ehql9Yg/edit?usp=sharing

Expected columns:

CREATED AT | FIRST NAME | LAST NAME | MILITARY ID | NCSC NO. | BLOOD GROUP | QUANTITY | SECRET CODE | FRONT IMAGE LINK | BACK IMAGE LINK | DOWNLOAD LINKS
