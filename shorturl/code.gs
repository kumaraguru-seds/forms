// --- Global Setup ---
const SHEET_ID = '1666kdh2J5Ep3R7J3GAWCWzSTDpOi6i1R6yj_wdN1EpI'; // Your Sheet ID
const SHEET_NAME = 'Links'; // Sheet for backup/source
const SLUG_COL = 2; // Column B (Shorten URL)
const URL_COL = 1;  // Column A (Long URL)
const EMAIL_COL = 4; // NEW: Column D for User Email
const ADMIN_EMAIL = 'manilunar07@gmail.com'; // Primary Admin Email (for notifications)
const BCC_EMAIL = 'manilunar07@gmail.com'; // BCC for all admin notifications
const SENDER_NAME = 'Kumaraguru SEDS'; // NEW: Sender Name

// --- GitHub Configuration ---
const GITHUB_USERNAME = 'kumaraguru-seds'; // <-- REPLACE
const GITHUB_REPO = 'forms';   // <-- REPLACE
const GITHUB_BRANCH = 'main';                // Usually 'main'
const GITHUB_FILE_PATH = 'links.json';       // File to store redirect data

/** Gets the spreadsheet by ID */
function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

/** Gets the stored GitHub Token */
function getGitHubToken() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const token = scriptProperties.getProperty('GITHUB_TOKEN');
  if (!token) {
    Logger.log('FATAL ERROR: GITHUB_TOKEN script property is not set.');
    throw new Error('GitHub token not configured in script properties.');
  }
  return token;
}

/** Fetches links from Sheet and updates links.json on GitHub */
function syncLinksToGitHub() {
  const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/`;
  let token;
  try {
    token = getGitHubToken(); // Will throw error if token is missing
  } catch (e) {
     Logger.log(e.message);
     return; // Stop execution if token is missing
  }


  // 1. Read links from the sheet
  const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
      Logger.log(`ERROR: Sheet '${SHEET_NAME}' not found during sync.`);
      return; // Stop sync if sheet missing
  }
  const data = sheet.getDataRange().getValues();
  const links = {};
  const startIdx = sheet.getFrozenRows() > 0 ? 1 : 0; // Skip headers
  for (let i = startIdx; i < data.length; i++) {
    const slug = data[i][SLUG_COL - 1];
    const longUrl = data[i][URL_COL - 1];
    if (slug && longUrl && typeof slug === 'string' && typeof longUrl === 'string') {
      links[slug.trim()] = longUrl.trim();
    }
  }
  const newJsonContent = JSON.stringify(links, null, 2); // Format JSON nicely

  // --- GitHub API Interaction ---
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    // 2. Get current file SHA
    const getFileOptions = { method: 'GET', headers: headers, muteHttpExceptions: true };
    const getFileResponse = UrlFetchApp.fetch(`${GITHUB_API_BASE}${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}&t=${Date.now()}`, getFileOptions); // Add cache buster
    const getFileResultText = getFileResponse.getContentText();
    let currentSha = null;

    if (getFileResponse.getResponseCode() === 200) {
      currentSha = JSON.parse(getFileResultText).sha;
    } else if (getFileResponse.getResponseCode() !== 404) {
      Logger.log(`ERROR getting file SHA: ${getFileResponse.getResponseCode()} - ${getFileResultText}`);
      return; // Stop if there's an error other than "not found"
    }

    // 3. Update (or create) the file
    const updatePayload = {
      message: `Sync short links from Google Sheet - ${new Date().toISOString()}`,
      content: Utilities.base64Encode(newJsonContent, Utilities.Charset.UTF_8), // Specify UTF-8
      branch: GITHUB_BRANCH,
      sha: currentSha // Include SHA if updating, omit if creating (null works)
    };

    const updateOptions = {
      method: 'PUT',
      headers: headers,
      contentType: 'application/json',
      payload: JSON.stringify(updatePayload),
      muteHttpExceptions: true
    };

    const updateResponse = UrlFetchApp.fetch(`${GITHUB_API_BASE}${GITHUB_FILE_PATH}`, updateOptions);
    const updateResultCode = updateResponse.getResponseCode();

    if (updateResultCode === 200 || updateResultCode === 201) {
      Logger.log(`Successfully synced ${GITHUB_FILE_PATH} to GitHub. SHA: ${currentSha ? 'Updated' : 'Created'}`);
    } else {
      Logger.log(`ERROR syncing to GitHub: ${updateResultCode} - ${updateResponse.getContentText()}`);
    }

  } catch (error) {
    Logger.log(`EXCEPTION during GitHub sync: ${error.message}\n${error.stack}`);
  }
}

/** Sends confirmation email to the user and notification to the admin. */
function sendNotificationEmails(longUrl, slug, userEmail, quotaRemaining) {
    const shortUrl = `https://kumaraguruseds.space/${slug}`;
    const date = new Date().toLocaleString();

    // --- Admin Email Content (Professional Table Structure) ---
    const adminSubject = `✅ NEW Short Link Created: ${slug}`;
    const adminBody = `
        <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
            <caption style="text-align: left; font-size: 1.2em; font-weight: bold; padding-bottom: 10px;">Link Submission Details</caption>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px; width: 30%; background-color: #f2f2f2; font-weight: bold;">Timestamp</td>
                <td style="border: 1px solid #ddd; padding: 10px;">${date}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px; width: 30%; background-color: #f2f2f2; font-weight: bold;">Short URL</td>
                <td style="border: 1px solid #ddd; padding: 10px;"><a href="${shortUrl}">${shortUrl}</a></td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px; width: 30%; background-color: #f2f2f2; font-weight: bold;">Original URL</td>
                <td style="border: 1px solid #ddd; padding: 10px;"><a href="${longUrl}">${longUrl}</a></td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px; width: 30%; background-color: #f2f2f2; font-weight: bold;">Submitter Email</td>
                <td style="border: 1px solid #ddd; padding: 10px;">${userEmail || 'N/A (Optional Field Left Blank)'}</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px; width: 30%; background-color: #f2f2f2; font-weight: bold;">Quota Remaining</td>
                <td style="border: 1px solid #ddd; padding: 10px;">${quotaRemaining}</td>
            </tr>
        </table>
        <p style="margin-top: 20px; font-size: 0.9em; color: #888;">*This link is now pending GitHub deployment.</p>
    `;

    // Send Admin Notification (To: ADMIN_EMAIL, BCC: BCC_EMAIL, From: SENDER_NAME)
    MailApp.sendEmail({
        to: ADMIN_EMAIL,
        bcc: BCC_EMAIL, // BCC is included here as requested
        subject: adminSubject,
        htmlBody: adminBody,
        name: SENDER_NAME // Sets the friendly sender name
    });

    // --- User Confirmation Email (if provided) ---
    if (userEmail) {
        const userSubject = `Your Short Link is Ready: ${slug}`;
        const userBody = `
            <p style="font-family: Arial, sans-serif;">Hello,</p>
            <p style="font-family: Arial, sans-serif;">Your custom short link has been successfully registered:</p>
            
            <table style="border-collapse: collapse; width: 100%; max-width: 500px; margin: 15px 0; font-family: Arial, sans-serif;">
                <tr>
                    <td style="border: 1px solid #ddd; padding: 10px; width: 30%; background-color: #e6f7ff; font-weight: bold;">Short Link</td>
                    <td style="border: 1px solid #ddd; padding: 10px;"><a href="${shortUrl}">${shortUrl}</a></td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 10px; width: 30%; background-color: #e6f7ff; font-weight: bold;">Destination</td>
                    <td style="border: 1px solid #ddd; padding: 10px; font-size: 0.9em;">${longUrl}</td>
                </tr>
            </table>

            <p style="font-family: Arial, sans-serif; font-size: 0.9em; color: #cc0000;">
                Note: It may take up to 60 seconds for the redirect to become active on the live domain.
            </p>
            <p style="font-family: Arial, sans-serif;">Thank you,<br>Kumaraguru SEDS Team</p>
        `;

        // Send User Email (To: userEmail, BCC: BCC_EMAIL, From: SENDER_NAME)
        MailApp.sendEmail({
            to: userEmail,
            bcc: BCC_EMAIL, // BCC is included here as requested
            subject: userSubject,
            htmlBody: userBody,
            name: SENDER_NAME // Sets the friendly sender name
        });
    }
}


/** Handles form submission (POST request) */
function doPost(e) {
  let longUrl, slug, userEmail;
  
  // Check Quota Remaining first (to store in the sheet later)
  const quotaRemaining = MailApp.getRemainingDailyQuota();

  try {
    longUrl = e.parameter.longUrl ? e.parameter.longUrl.trim() : null;
    slug = e.parameter.slug ? e.parameter.slug.trim() : null;
    userEmail = e.parameter.email ? e.parameter.email.trim() : null; // Get optional email

    // Validate required fields and minimum format
    if (!longUrl || !slug || !/^[a-zA-Z0-9_\-\/]+$/.test(slug) || !/^https?:\/\/.+/.test(longUrl)) {
      return ContentService.createTextOutput("Error: Invalid input format or missing required fields.").setMimeType(ContentService.MimeType.TEXT);
    }
    
    // Validate optional email format if it exists
    if (userEmail && !/^\S+@\S+\.\S+$/.test(userEmail)) {
      return ContentService.createTextOutput("Error: Invalid email address format.").setMimeType(ContentService.MimeType.TEXT);
    }

    const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
        return ContentService.createTextOutput(`Error: Sheet '${SHEET_NAME}' not found.`).setMimeType(ContentService.MimeType.TEXT);
    }

    // Check for existing slug (duplicate check during final submission)
    const lastRow = sheet.getLastRow();
    if (lastRow > 0) {
      const startRow = sheet.getFrozenRows() > 0 ? 2 : 1;
      if (lastRow >= startRow) {
          const existingSlugs = sheet.getRange(startRow, SLUG_COL, lastRow - startRow + 1, 1).getValues().flat();
          if (existingSlugs.map(s => String(s).trim()).includes(slug)) {
            return ContentService.createTextOutput(`Error: Short code '${slug}' is already taken.`).setMimeType(ContentService.MimeType.TEXT);
         }
      }
    }

    // Write to Google Sheet (A: Long URL, B: Slug, C: Timestamp, D: Email ID)
    sheet.appendRow([longUrl, slug, new Date(), userEmail || '']);

    // Send email notifications
    sendNotificationEmails(longUrl, slug, userEmail, quotaRemaining);

    // Trigger the sync to GitHub
    syncLinksToGitHub();

    // Respond confirmation
    return ContentService.createTextOutput(`Link added to sheet. Sync to GitHub initiated.`).setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    Logger.log(`Error in doPost (Slug: ${slug || 'N/A'}): ${error.message}\n${error.stack}`);
    return ContentService.createTextOutput(`System Error processing request. Check logs.`).setMimeType(ContentService.MimeType.TEXT);
  }
}

/** Handles GET requests, primarily for real-time slug checking. */
function doGet(e) {
  const action = e.parameter.action;
  const slug = e.parameter.slug;

  // --- 1. Handle Slug Availability Check ---
  if (action === 'checkSlug' && slug) {
    try {
      const sheet = getSpreadsheet().getSheetByName(SHEET_NAME);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ error: `Sheet '${SHEET_NAME}' not found.` }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      let isAvailable = true;
      const lastRow = sheet.getLastRow();

      if (lastRow > 0) {
        const startRow = sheet.getFrozenRows() > 0 ? 2 : 1;
        if (lastRow >= startRow) {
          const existingSlugs = sheet.getRange(startRow, SLUG_COL, lastRow - startRow + 1, 1).getValues().flat();
          if (existingSlugs.map(s => String(s).trim()).includes(slug.trim())) {
            isAvailable = false;
          }
        }
      }
      
      // Return JSON response
      return ContentService.createTextOutput(JSON.stringify({ available: isAvailable }))
        .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
      Logger.log(`Error in doGet (checkSlug): ${error.message}`);
      return ContentService.createTextOutput(JSON.stringify({ error: `System Error: ${error.message}` }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // --- 2. Default doGet response (if no action is specified) ---
  return HtmlService.createHtmlOutput('<h1>URL Shortener Sync Service</h1><p>Handles link creation and syncs to GitHub.</p>');
}
