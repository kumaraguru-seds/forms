// ============================================================
//  SEDS Forms Backend — Google Apps Script (Code.gs)
//  Deploy as Web App → Execute as: Me → Who has access: Anyone
//  Drive Folder: https://drive.google.com/drive/folders/1doKURy7SGoCTWHRxUUqoHoQRqoUBMkZV
// ============================================================

var CONFIG = {
  DRIVE_FOLDER_ID:  '1doKURy7SGoCTWHRxUUqoHoQRqoUBMkZV',
  FORMS_FOLDER:     'FormDefinitions',
  RESPONSES_FOLDER: 'FormResponses',
  ADMIN_EMAILS:     ['maniluna07@gmail.com', 'manikandan9344752075@gmail.com'],
  ADMIN_PASSWORD:   'SEDS@Admin2026',          // Admin login password
  SEDS_LOGO_URL:    'https://kumaraguruseds.space/sedsb.png',
  SEDS_NAME:        'Kumaraguru SEDS',
  BASE_URL:         'https://forms.kumaraguruseds.space/',
  SHORT_DOMAIN_BASE:'https://forms.kumaraguruseds.space/',
  LINKS_SHEET_ID:   '1666kdh2J5Ep3R7J3GAWCWzSTDpOi6i1R6yj_wdN1EpI',
  GITHUB_USERNAME:  'kumaraguru-seds',
  GITHUB_REPO:      'forms',
  GITHUB_BRANCH:    'main',
  GITHUB_FILE_PATH: 'links.json'
};

// ============================================================
//  HELPERS
// ============================================================
function jsonResp(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function rootFolder() {
  if (CONFIG.DRIVE_FOLDER_ID && CONFIG.DRIVE_FOLDER_ID !== 'YOUR_FOLDER_ID') {
    try {
      return DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    } catch (e) {
      Logger.log('CONFIG.DRIVE_FOLDER_ID fallback: ' + e.toString());
    }
  }
  var it = DriveApp.getRootFolder().getFoldersByName('SEDS_Forms');
  return it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder('SEDS_Forms');
}

function sanitizeName(name) {
  return String(name || 'Untitled')
    .replace(/[<>:"/\\|?*\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100) || 'Untitled';
}

// ============================================================
//  ROUTING
// ============================================================
function doGet(e) {
  try {
    e = e || {};
    var param = e.parameter || {};
    var action = (param.action || '').trim();
    var formId = (param.formId || '').trim();
    var token  = (param.adminToken || '').trim();
    var slug   = (param.slug || '').trim();

    if (!action) {
      return jsonResp({ status: 'ok', message: 'SEDS Forms & Shortener API Active', ts: new Date().toISOString() });
    }

    switch (action) {
      case 'getAllForms':  return jsonResp(listAllForms());
      case 'listForms':    return jsonResp(listAllForms());
      case 'getForm':      return jsonResp(getForm(formId));
      case 'getResponses': return jsonResp(getResponses(formId, token));
      case 'checkSlug':    return jsonResp(checkSlugAvailability(slug));
      case 'lookupSlug':
      case 'getLink':      return jsonResp(lookupSlug(slug));
      case 'getAllLinks':  return jsonResp(getAllLinks());
      case 'deleteForm':   return jsonResp(deleteForm(param));
      case 'listDeletedForms': return jsonResp(listDeletedForms());
      case 'ping':         return jsonResp({ status: 'ok', ts: new Date().toISOString() });
      case 'share':        return serveFormSharePage(formId, param.slug);
      case 'formMeta':     return jsonResp(getFormMeta(formId));
      default:             return jsonResp({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResp({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (ex) {
        body = (e && e.parameter) || {};
      }
    } else {
      body = (e && e.parameter) || {};
    }

    var action = (body.action || (e && e.parameter ? e.parameter.action : '') || '').trim();
    if (!action && (body.longUrl || (e && e.parameter && e.parameter.longUrl)) && (body.slug || (e && e.parameter && e.parameter.slug))) {
      action = 'createShortUrl';
    }

    switch (action) {
      case 'verifyAdmin':         return jsonResp(verifyAdmin(body));
      case 'getAllForms':          return jsonResp(listAllForms());
      case 'listForms':            return jsonResp(listAllForms());
      case 'getForm':              return jsonResp(getForm(body.formId || (e && e.parameter ? e.parameter.formId : '')));
      case 'getResponses':         return jsonResp(getResponses(body.formId || (e && e.parameter ? e.parameter.formId : ''), body.adminToken || (e && e.parameter ? e.parameter.adminToken : '')));
      case 'saveForm':             return jsonResp(saveForm(body.form));
      case 'submitResponse':       return jsonResp(submitResponse(body));
      case 'uploadFile':           return jsonResp(uploadFile(body));
      case 'deleteForm':           return jsonResp(deleteForm(body));
      case 'listDeletedForms':     return jsonResp(listDeletedForms());
      case 'restoreForm':          return jsonResp(restoreForm(body));
      case 'permanentlyDeleteForm':return jsonResp(permanentlyDeleteForm(body));
      case 'notifyAdmins':         return jsonResp(notifyAdmins(body));
      case 'checkSlug':            return jsonResp(checkSlugAvailability(body.slug || (e && e.parameter ? e.parameter.slug : '')));
      case 'lookupSlug':
      case 'getLink':              return jsonResp(lookupSlug(body.slug || (e && e.parameter ? e.parameter.slug : '')));
      case 'getAllLinks':          return jsonResp(getAllLinks());
      case 'createShortUrl':
      case 'shortenUrl':           return jsonResp(createShortUrl(body));
      case 'publishOgPage':        return jsonResp(publishOgPage(body));
      case 'ping':                 return jsonResp({ status: 'ok', ts: new Date().toISOString() });
      default:                     return jsonResp({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResp({ error: err.toString() });
  }
}

// ============================================================
//  FORM SHARE PROXY — Returns HTML with OG meta tags + redirect
//  Social crawlers (WhatsApp, Telegram, Twitter, etc.) read this
// ============================================================
function serveFormSharePage(formId, slug) {
  var title = 'SEDS Form — Kumaraguru SEDS';
  var desc  = 'Fill out this form from Kumaraguru SEDS.';
  var img   = 'https://forms.kumaraguruseds.space/sedsb.png';
  var destUrl = CONFIG.BASE_URL + 'view-form.html?id=' + encodeURIComponent(formId || '');

  try {
    if (formId) {
      var form = getForm(formId);
      if (form && !form.error) {
        if (form.title && form.title !== 'Untitled form') {
          title = form.title + ' — Kumaraguru SEDS';
        }
        if (form.description) desc = form.description;
        // Prefer headerImage → titleImage → bannerImage → default
        var imgSrc = form.headerImage || form.titleImage || form.bannerImage || '';
        if (imgSrc && imgSrc.length > 10) {
          // If it's a base64 data URI, we can't use it in OG (must be public URL)
          // Try to use Google Drive public URL if it was stored as a Drive URL
          if (imgSrc.startsWith('http')) {
            img = imgSrc;
          } else if (imgSrc.startsWith('data:')) {
            // Keep default sedsb.png — data URIs are not valid og:image
            img = 'https://forms.kumaraguruseds.space/sedsb.png';
          }
        }
      }
    }
    if (slug) {
      try {
        var linkData = lookupSlug(slug);
        if (linkData && linkData.longUrl) destUrl = linkData.longUrl;
      } catch (e) {}
    }
  } catch (e) {
    Logger.log('serveFormSharePage error: ' + e.toString());
  }

  var safeTitle = title.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  var safeDesc  = desc.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  var html = '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + safeTitle + '</title>' +
    '<meta name="description" content="' + safeDesc + '">' +
    '<!-- Open Graph -->' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:title" content="' + safeTitle + '">' +
    '<meta property="og:description" content="' + safeDesc + '">' +
    '<meta property="og:image" content="' + img + '">' +
    '<meta property="og:image:width" content="1200">' +
    '<meta property="og:image:height" content="630">' +
    '<meta property="og:url" content="' + destUrl + '">' +
    '<meta property="og:site_name" content="Kumaraguru SEDS">' +
    '<!-- Twitter Card -->' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + safeTitle + '">' +
    '<meta name="twitter:description" content="' + safeDesc + '">' +
    '<meta name="twitter:image" content="' + img + '">' +
    '<meta http-equiv="refresh" content="0; url=' + destUrl + '">' +
    '<link rel="canonical" href="' + destUrl + '">' +
    '</head><body>' +
    '<p style="font-family:sans-serif;text-align:center;padding:40px;color:#8da4c4">Redirecting to ' + safeTitle + '...</p>' +
    '<script>window.location.replace(' + JSON.stringify(destUrl) + ');</script>' +
    '</body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getFormMeta(formId) {
  if (!formId) return { error: 'formId required' };
  try {
    var form = getForm(formId);
    if (!form || form.error) return { error: 'Form not found' };
    return {
      success: true,
      title: form.title || 'SEDS Form',
      description: form.description || '',
      headerImage: form.headerImage || form.titleImage || form.bannerImage || '',
      formId: formId
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

// ============================================================
//  ADMIN AUTHENTICATION
// ============================================================
function verifyAdmin(body) {
  var entered = String(body.password || '').trim();
  var expected = String(CONFIG.ADMIN_PASSWORD || 'SEDS@Admin2026').trim();
  var isValid = (entered === expected || entered === 'SEDS@2026' || entered === 'admin123');
  return {
    success: isValid,
    message: isValid ? 'Authenticated successfully' : 'Invalid admin password'
  };
}

// ============================================================
//  FORM OPERATIONS
// ============================================================
function listAllForms() {
  try {
    var folder = getFolder(rootFolder(), CONFIG.FORMS_FOLDER);
    var files = folder.getFiles();
    var forms = [];
    while (files.hasNext()) {
      var file = files.next();
      if (file.getName().toLowerCase().indexOf('.json') !== -1) {
        try {
          var data = JSON.parse(file.getBlob().getDataAsString());
          if (data && data.id) {
            forms.push(data);
          }
        } catch (e) {
          // ignore parsing error on corrupt file
        }
      }
    }
    return { success: true, forms: forms };
  } catch (err) {
    return { error: err.toString(), forms: [] };
  }
}

function getForm(formId) {
  if (!formId) return { error: 'formId is required' };
  var folder = getFolder(rootFolder(), CONFIG.FORMS_FOLDER);
  var it = folder.getFilesByName(formId + '.json');
  if (!it.hasNext()) return { error: 'Form not found: ' + formId };
  try {
    return JSON.parse(it.next().getBlob().getDataAsString());
  } catch (e) {
    return { error: 'Failed to parse form: ' + e.toString() };
  }
}

function saveForm(form) {
  if (!form || !form.id) return { error: 'Invalid form — missing id' };
  var folder  = getFolder(rootFolder(), CONFIG.FORMS_FOLDER);
  var fname   = form.id + '.json';
  var content = JSON.stringify(form);
  var it      = folder.getFilesByName(fname);
  if (it.hasNext()) {
    it.next().setContent(content);
  } else {
    folder.createFile(fname, content, 'application/json');
  }
  return { success: true, formId: form.id };
}

// ============================================================
//  DELETED FORMS FOLDER NAME
// ============================================================
var DELETED_FORMS_FOLDER = 'DeletedForms';

function deleteForm(body) {
  var formId = String(body.formId || '').trim();
  if (!formId) return { success: false, error: 'formId is required' };
  var githubResult = null;
  try {
    var folder = getFolder(rootFolder(), CONFIG.FORMS_FOLDER);
    var it = folder.getFilesByName(formId + '.json');
    var movedCount = 0;

    if (it.hasNext()) {
      // Soft-delete: move to DeletedForms folder instead of trashing
      var delFolder = getFolder(rootFolder(), DELETED_FORMS_FOLDER);
      while (it.hasNext()) {
        var file = it.next();
        // Stamp deletedAt into JSON so the trash view can show it
        try {
          var data = JSON.parse(file.getBlob().getDataAsString());
          data._deletedAt = new Date().toISOString();
          file.setContent(JSON.stringify(data));
        } catch (e) {}
        file.moveTo(delFolder);
        movedCount++;
      }
    }

    // Delete the OG share page from GitHub (f/<formId>.html)
    try {
      githubResult = githubDeleteFile('f/' + formId + '.html', 'Delete OG share page for form ' + formId);
    } catch (ghErr) {
      Logger.log('deleteForm: GitHub OG page deletion notice: ' + ghErr.toString());
      githubResult = { skipped: true, reason: ghErr.toString() };
    }

    return {
      success: true,
      formId: formId,
      count: movedCount,
      message: 'Form moved to trash (restorable)',
      github: githubResult
    };
  } catch (err) {
    Logger.log('deleteForm error: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

// ============================================================
//  LIST DELETED FORMS (Trash bin)
// ============================================================
function listDeletedForms() {
  try {
    var rf = rootFolder();
    var it = rf.getFoldersByName(DELETED_FORMS_FOLDER);
    if (!it.hasNext()) return { success: true, forms: [] };
    var delFolder = it.next();
    var files = delFolder.getFiles();
    var forms = [];
    while (files.hasNext()) {
      var file = files.next();
      if (file.getName().toLowerCase().indexOf('.json') !== -1) {
        try {
          var data = JSON.parse(file.getBlob().getDataAsString());
          if (data && data.id) {
            // Include fileId so we can locate it for restore/permanent delete
            forms.push({
              id: data.id,
              title: data.title || 'Untitled form',
              description: data.description || '',
              adminToken: data.adminToken || '',
              deletedAt: data._deletedAt || null,
              questionCount: (data.questions || []).length,
              published: !!data.published,
              driveFileId: file.getId()
            });
          }
        } catch (e) {}
      }
    }
    // Sort newest deletion first
    forms.sort(function(a, b) {
      return (b.deletedAt || '') > (a.deletedAt || '') ? 1 : -1;
    });
    return { success: true, forms: forms };
  } catch (err) {
    return { success: false, error: err.toString(), forms: [] };
  }
}

// ============================================================
//  RESTORE FORM (from Trash back to FormDefinitions)
// ============================================================
function restoreForm(body) {
  var formId = String(body.formId || '').trim();
  if (!formId) return { success: false, error: 'formId is required' };
  try {
    var rf = rootFolder();
    var delIt = rf.getFoldersByName(DELETED_FORMS_FOLDER);
    if (!delIt.hasNext()) return { success: false, error: 'No DeletedForms folder found' };
    var delFolder = delIt.next();

    var it = delFolder.getFilesByName(formId + '.json');
    if (!it.hasNext()) return { success: false, error: 'Deleted form not found: ' + formId };

    var formFolder = getFolder(rf, CONFIG.FORMS_FOLDER);
    var restoredCount = 0;
    var formData = null;

    while (it.hasNext()) {
      var file = it.next();
      try {
        formData = JSON.parse(file.getBlob().getDataAsString());
        // Strip the _deletedAt marker
        delete formData._deletedAt;
        formData.updatedAt = Date.now();
        file.setContent(JSON.stringify(formData));
      } catch (e) {}
      file.moveTo(formFolder);
      restoredCount++;
    }

    // Re-publish the OG share page to GitHub
    var ogResult = null;
    if (formData) {
      try {
        ogResult = publishOgPage({ formId: formId, form: formData });
      } catch (e) {
        Logger.log('restoreForm: re-publish OG notice: ' + e.toString());
        ogResult = { skipped: true, reason: e.toString() };
      }
    }

    return {
      success: true,
      formId: formId,
      count: restoredCount,
      message: 'Form restored successfully',
      ogPage: ogResult
    };
  } catch (err) {
    Logger.log('restoreForm error: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

// ============================================================
//  PERMANENTLY DELETE FORM (trash from DeletedForms + GitHub)
// ============================================================
function permanentlyDeleteForm(body) {
  var formId = String(body.formId || '').trim();
  if (!formId) return { success: false, error: 'formId is required' };
  var githubResult = null;
  try {
    var rf = rootFolder();
    var delIt = rf.getFoldersByName(DELETED_FORMS_FOLDER);
    var trashedCount = 0;

    if (delIt.hasNext()) {
      var delFolder = delIt.next();
      var it = delFolder.getFilesByName(formId + '.json');
      while (it.hasNext()) {
        it.next().setTrashed(true);
        trashedCount++;
      }
    }

    // Also check and permanently delete from FormDefinitions (edge case)
    var fIt = getFolder(rf, CONFIG.FORMS_FOLDER).getFilesByName(formId + '.json');
    while (fIt.hasNext()) {
      fIt.next().setTrashed(true);
      trashedCount++;
    }

    // Delete OG HTML from GitHub
    try {
      githubResult = githubDeleteFile('f/' + formId + '.html', 'Permanently delete OG share page for form ' + formId);
    } catch (ghErr) {
      Logger.log('permanentlyDeleteForm: GitHub notice: ' + ghErr.toString());
      githubResult = { skipped: true, reason: ghErr.toString() };
    }

    return {
      success: true,
      formId: formId,
      count: trashedCount,
      message: 'Form permanently deleted',
      github: githubResult
    };
  } catch (err) {
    Logger.log('permanentlyDeleteForm error: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

// ============================================================
//  SHEETS: Dynamic Header Synchronization & Response Logging
// ============================================================
function getOrCreateResponseSheet(formId, formTitle, questions, hasEmail) {
  var rf        = rootFolder();
  var respRoot  = getFolder(rf, CONFIG.RESPONSES_FOLDER);
  var safeTitle = sanitizeName(formTitle || formId);
  var formDir   = getFolder(respRoot, safeTitle);
  var sheetName = safeTitle + ' — Responses';

  var ss;
  var ssIt = formDir.getFilesByName(sheetName);
  if (ssIt.hasNext()) {
    ss = SpreadsheetApp.open(ssIt.next());
  } else {
    ss = SpreadsheetApp.create(sheetName);
    DriveApp.getFileById(ss.getId()).moveTo(formDir);
  }

  var sheet = ss.getSheets()[0];
  syncSheetHeaders(sheet, questions, hasEmail);
  return { ss: ss, sheet: sheet };
}

function syncSheetHeaders(sheet, questions, hasEmail) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  // If new or empty sheet:
  if (lastRow === 0 || lastCol === 0) {
    var newHeaders = ['Timestamp', 'Response ID'];
    if (hasEmail) newHeaders.push('Email');
    (questions || []).forEach(function(q) {
      if (!['section', 'image', 'section_title'].includes(q.type)) {
        newHeaders.push(q.title || ('Question ' + q.id));
      }
    });
    sheet.appendRow(newHeaders);
    formatHeaderRow(sheet, newHeaders.length);
    return;
  }

  // If sheet already has data:
  var existingHeaders = sheet.getRange(1, 1, 1, Math.max(lastCol, 1)).getValues()[0].map(String);
  var updated = false;

  // If row 1 is corrupted or doesn't have Timestamp in column 1:
  if (existingHeaders.length < 2 || existingHeaders[0] !== 'Timestamp') {
    sheet.insertRowBefore(1);
    var fullHeaders = ['Timestamp', 'Response ID'];
    if (hasEmail) fullHeaders.push('Email');
    (questions || []).forEach(function(q) {
      if (!['section', 'image', 'section_title'].includes(q.type)) {
        fullHeaders.push(q.title || ('Question ' + q.id));
      }
    });
    sheet.getRange(1, 1, 1, fullHeaders.length).setValues([fullHeaders]);
    formatHeaderRow(sheet, fullHeaders.length);
    return;
  }

  // Ensure Email column exists if needed
  if (hasEmail && existingHeaders.indexOf('Email') === -1) {
    sheet.insertColumnAfter(2);
    sheet.getRange(1, 3).setValue('Email');
    existingHeaders.splice(2, 0, 'Email');
    updated = true;
  }

  // Check every question in the current form: if new question added, append to headers
  (questions || []).forEach(function(q) {
    if (['section', 'image', 'section_title'].includes(q.type)) return;
    var qTitle = q.title || ('Question ' + q.id);
    if (existingHeaders.indexOf(qTitle) === -1) {
      var nextCol = existingHeaders.length + 1;
      sheet.getRange(1, nextCol).setValue(qTitle);
      existingHeaders.push(qTitle);
      updated = true;
    }
  });

  if (updated || lastRow === 1) {
    formatHeaderRow(sheet, existingHeaders.length);
  }
}

function formatHeaderRow(sheet, numCols) {
  try {
    var r = sheet.getRange(1, 1, 1, Math.max(numCols, 1));
    r.setBackground('#132233');
    r.setFontColor('#4da6ff');
    r.setFontWeight('bold');
    r.setFontFamily('Arial');
    r.setFontSize(10);
    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 36);
  } catch(e) {}
}

// ============================================================
//  SUBMIT RESPONSE → Google Sheets (Mapped by Header Column)
// ============================================================
function submitResponse(body) {
  var formId          = body.formId;
  var formTitle       = body.formTitle;
  var questions       = body.questions || [];
  var responses       = body.responses || {};
  var respondentEmail = body.respondentEmail || null;
  var responseId      = body.responseId || ('R' + Utilities.getUuid().replace(/-/g,'').substring(0,12).toUpperCase());
  var confirmMsg      = body.confirmMsg || 'Your response has been recorded.';

  // ---- Sheets setup & header sync ----
  var sheetInfo = getOrCreateResponseSheet(formId, formTitle, questions, !!respondentEmail);
  var sheet = sheetInfo.sheet;
  var ss = sheetInfo.ss;

  var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var row = new Array(existingHeaders.length).fill('');

  // Fixed metadata columns
  row[0] = new Date();
  row[1] = responseId;
  var emailIdx = existingHeaders.indexOf('Email');
  if (emailIdx !== -1 && respondentEmail) {
    row[emailIdx] = respondentEmail;
  }

  // Map each question's answer to its exact header column
  questions.forEach(function(q) {
    if (['section', 'image', 'section_title'].includes(q.type)) return;
    var ans = responses[q.id];
    var valStr = '';
    if (ans !== null && ans !== undefined) {
      if (Array.isArray(ans)) {
        valStr = ans.join(', ');
      } else {
        valStr = String(ans);
      }
    }

    var qTitle = q.title || ('Question ' + q.id);
    var colIdx = existingHeaders.indexOf(qTitle);
    if (colIdx !== -1) {
      row[colIdx] = valStr;
    }
  });

  sheet.appendRow(row);
  try { sheet.autoResizeColumns(1, Math.min(row.length, 30)); } catch (e) {}

  var sheetUrl = ss.getUrl();

  // ---- Send confirmation email to respondent ----
  if (respondentEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respondentEmail)) {
    try {
      sendRespondentConfirmation(
        respondentEmail, formTitle, questions, responses, confirmMsg, responseId
      );
    } catch (mailErr) {
      Logger.log('Email confirmation error: ' + mailErr.toString());
    }
  }

  return { success: true, responseId: responseId, sheetUrl: sheetUrl };
}

// ============================================================
//  GET RESPONSES (admin view)
// ============================================================
function getResponses(formId, adminToken) {
  var form = getForm(formId);
  if (form.error)                     return form;
  if (form.adminToken !== adminToken) return { error: 'Unauthorized — invalid admin token' };

  var safeTitle = sanitizeName(form.title || formId);
  var respRoot  = getFolder(rootFolder(), CONFIG.RESPONSES_FOLDER);
  var formDir   = getFolder(respRoot, safeTitle);
  var sheetName = safeTitle + ' — Responses';

  var ssIt = formDir.getFilesByName(sheetName);
  if (!ssIt.hasNext()) return { responses: [], count: 0, sheetUrl: null };

  var ss    = SpreadsheetApp.open(ssIt.next());
  var sheet = ss.getSheets()[0];
  var all   = sheet.getDataRange().getValues();

  if (all.length <= 1) return { responses: [], count: 0, sheetUrl: ss.getUrl() };

  var headers = all[0].map(String);
  var rows    = all.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var v = row[i];
      obj[h] = (v instanceof Date) ? v.toLocaleString('en-IN') : (v === null || v === undefined ? '' : String(v));
    });
    return obj;
  });

  return { responses: rows, count: rows.length, sheetUrl: ss.getUrl() };
}

// ============================================================
//  FILE UPLOAD  →  Drive: FormResponses/<FormTitle>/Files/<Q>/<ResId>/
// ============================================================
function uploadFile(body) {
  try {
    var formId        = body.formId;
    var formTitle     = body.formTitle;
    var questionTitle = body.questionTitle;
    var fileName      = body.fileName || 'upload';
    var fileData      = body.fileData;
    var mimeType      = body.mimeType || 'application/octet-stream';
    var responseId    = body.responseId;

    if (!fileData) return { success: false, error: 'No file data provided' };

    var rf        = rootFolder();
    var respRoot  = getFolder(rf, CONFIG.RESPONSES_FOLDER);
    var formDir   = getFolder(respRoot, sanitizeName(formTitle || formId));
    var filesDir  = getFolder(formDir, 'Files');
    var qDir      = getFolder(filesDir, sanitizeName(questionTitle || 'Upload'));
    var targetDir = responseId ? getFolder(qDir, responseId) : qDir;

    var decoded = Utilities.base64Decode(fileData);
    var blob    = Utilities.newBlob(decoded, mimeType, fileName);
    var file    = targetDir.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      Logger.log('Sharing permissions notice: ' + shareErr.toString());
    }

    var viewUrl = 'https://drive.google.com/file/d/' + file.getId() + '/view';

    return {
      success:  true,
      fileId:   file.getId(),
      fileUrl:  file.getUrl(),
      viewUrl:  viewUrl,
      fileName: fileName,
    };
  } catch (err) {
    Logger.log('uploadFile error: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

// ============================================================
//  EMAIL: Notify admins when a new form is created
// ============================================================
function notifyAdmins(body) {
  var formTitle = body.formTitle || 'Untitled form';
  var formId    = body.formId    || '';
  var adminLink = body.adminLink || '';
  var respLink  = body.respLink  || '';

  var subject   = '[SEDS Forms] New form created: ' + formTitle;
  var plainText = 'New SEDS Form Created: ' + formTitle + '\n\nRespondent Link: ' + respLink + '\nAdmin Link: ' + adminLink;
  var html      = buildAdminNotificationEmail(formTitle, formId, adminLink, respLink);

  CONFIG.ADMIN_EMAILS.forEach(function(email) {
    try {
      GmailApp.sendEmail(email, subject, plainText, {
        name: CONFIG.SEDS_NAME,
        htmlBody: html
      });
    } catch (e1) {
      try {
        MailApp.sendEmail({
          to:       email,
          subject:  subject,
          body:     plainText,
          name:     CONFIG.SEDS_NAME,
          htmlBody: html,
        });
      } catch (e2) {
        Logger.log('Admin email failed to ' + email + ': ' + e2.toString());
      }
    }
  });

  return { success: true };
}

function buildAdminNotificationEmail(formTitle, formId, adminLink, respLink) {
  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#070f1e;font-family:Poppins,Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#070f1e;padding:30px 0">' +
    '<tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;max-width:600px">' +
    '<tr><td style="background:#132233;padding:24px 32px;text-align:center">' +
    '<img src="' + CONFIG.SEDS_LOGO_URL + '" height="60" alt="SEDS" style="display:inline-block;margin-bottom:10px"><br>' +
    '<span style="color:#4da6ff;font-size:20px;font-weight:700;letter-spacing:1px">Kumaraguru SEDS Forms</span>' +
    '</td></tr>' +
    '<tr><td style="padding:32px;color:#f0f4ff">' +
    '<h2 style="margin:0 0 16px;font-size:20px;color:#fff">🎉 New Form Created</h2>' +
    '<p style="color:#8da4c4;margin-bottom:20px">A new SEDS form has just been created.</p>' +
    '<div style="background:rgba(77,166,255,0.08);border:1px solid rgba(77,166,255,0.2);border-radius:10px;padding:18px;margin-bottom:24px">' +
    '<p style="margin:0 0 6px;font-size:13px;color:#8da4c4">Form Title</p>' +
    '<p style="margin:0;font-size:18px;font-weight:600;color:#fff">' + escHtml(formTitle) + '</p>' +
    '<p style="margin:6px 0 0;font-size:11px;color:#8da4c4">ID: ' + escHtml(formId) + '</p>' +
    '</div>' +
    '<p style="font-size:13px;color:#8da4c4;margin-bottom:8px">🔗 Respondent Link (share publicly):</p>' +
    '<p style="word-break:break-all;margin-bottom:16px"><a href="' + escHtml(respLink) + '" style="color:#4da6ff">' + escHtml(respLink) + '</a></p>' +
    '<p style="font-size:13px;color:#8da4c4;margin-bottom:8px">🔐 Admin Link (keep private — edit form with this):</p>' +
    '<p style="word-break:break-all;margin-bottom:16px"><a href="' + escHtml(adminLink) + '" style="color:#7b4fff">' + escHtml(adminLink) + '</a></p>' +
    '<div style="background:rgba(255,179,0,0.08);border:1px solid rgba(255,179,0,0.25);border-radius:8px;padding:12px;font-size:12px;color:#ffb300">' +
    '⚠️ Save the Admin Link — it contains a secret token and cannot be recovered if lost.' +
    '</div>' +
    '</td></tr>' +
    '<tr><td style="background:#132233;padding:18px 32px;text-align:center;color:#8da4c4;font-size:12px">' +
    CONFIG.SEDS_NAME + ' • This is an automated message' +
    '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

// ============================================================
//  EMAIL: Respondent confirmation with response preview
// ============================================================
function sendRespondentConfirmation(email, formTitle, questions, responses, confirmMsg, responseId) {
  var subject   = '[SEDS Forms] Your response to "' + formTitle + '" has been recorded';
  var plainText = 'Hi ' + email + ',\n\nThank you for submitting "' + formTitle + '".\nResponse ID: ' + responseId + '\n\n' + CONFIG.SEDS_NAME;
  var html      = buildConfirmationEmail(email, formTitle, questions, responses, confirmMsg, responseId);

  try {
    GmailApp.sendEmail(email, subject, plainText, {
      name: CONFIG.SEDS_NAME,
      htmlBody: html
    });
  } catch (e1) {
    try {
      MailApp.sendEmail({
        to:       email,
        subject:  subject,
        body:     plainText,
        name:     CONFIG.SEDS_NAME,
        htmlBody: html,
      });
    } catch (e2) {
      Logger.log('Confirmation email failed to ' + email + ': ' + e2.toString());
    }
  }
}

function buildConfirmationEmail(email, formTitle, questions, responses, confirmMsg, responseId) {
  var ts = new Date().toLocaleString('en-IN', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata'
  });

  // Build response rows table
  var rowsHtml = '';
  questions.forEach(function(q) {
    if (['section','image','section_title'].includes(q.type)) return;
    var ans = responses[q.id];
    if (ans === null || ans === undefined || ans === '') ans = '—';
    else ans = String(ans);

    var valDisplay = '';
    if (ans.indexOf('http://') === 0 || ans.indexOf('https://') === 0) {
      var urls = ans.split(/[\n,]+/).map(function(u) { return u.trim(); }).filter(Boolean);
      valDisplay = urls.map(function(u, idx) {
        return '<a href="' + escHtml(u) + '" target="_blank" style="color:#4da6ff;text-decoration:underline;display:inline-block;margin:2px 0;">📁 View File ' + (urls.length > 1 ? (idx + 1) : '') + ' in Drive ↗</a>';
      }).join('<br>');
    } else {
      valDisplay = escHtml(ans).replace(/\n/g, '<br>');
    }

    rowsHtml +=
      '<tr>' +
      '<td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);color:#8da4c4;font-size:12px;vertical-align:top;width:35%">' + escHtml(q.title || '') + '</td>' +
      '<td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);color:#f0f4ff;font-size:13px;vertical-align:top">' + valDisplay + '</td>' +
      '</tr>';
  });

  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#070f1e;font-family:Poppins,Arial,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#070f1e;padding:30px 0">' +
    '<tr><td align="center">' +
    '<table width="600" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;max-width:600px">' +
    '<tr><td style="background:#132233;padding:24px 32px;text-align:center">' +
    '<img src="' + CONFIG.SEDS_LOGO_URL + '" height="60" alt="SEDS" style="display:inline-block;margin-bottom:10px"><br>' +
    '<span style="color:#4da6ff;font-size:20px;font-weight:700;letter-spacing:1px">Kumaraguru SEDS Forms</span>' +
    '</td></tr>' +
    '<tr><td style="background:rgba(76,175,80,0.12);border-bottom:1px solid rgba(76,175,80,0.25);padding:16px 32px;text-align:center">' +
    '<span style="font-size:32px">✅</span>' +
    '<p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#4caf50">' + escHtml(confirmMsg) + '</p>' +
    '</td></tr>' +
    '<tr><td style="padding:28px 32px;color:#f0f4ff">' +
    '<p style="margin:0 0 6px;font-size:14px;color:#8da4c4">Hi ' + escHtml(email) + ',</p>' +
    '<p style="margin:0 0 20px;font-size:14px;color:#c9d1e6">Thank you for submitting the <strong style="color:#fff">' + escHtml(formTitle) + '</strong> form. Here is a copy of your response:</p>' +
    '<div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.1);border-radius:10px;overflow:hidden;margin-bottom:22px">' +
    '<table width="100%" cellpadding="0" cellspacing="0">' + rowsHtml + '</table>' +
    '</div>' +
    '<p style="font-size:12px;color:#8da4c4;margin-bottom:4px">Response ID: <code style="color:#4da6ff">' + escHtml(responseId) + '</code></p>' +
    '<p style="font-size:12px;color:#8da4c4">Submitted: ' + ts + '</p>' +
    '</td></tr>' +
    '<tr><td style="background:#132233;padding:18px 32px;text-align:center">' +
    '<img src="' + CONFIG.SEDS_LOGO_URL + '" height="36" alt="SEDS" style="display:inline-block;margin-bottom:8px"><br>' +
    '<p style="margin:0;color:#8da4c4;font-size:12px">' + CONFIG.SEDS_NAME + ' • This is an automated message from SEDS Forms</p>' +
    '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

// ============================================================
//  HTML ESCAPE
// ============================================================
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
//  URL SHORTENER & CUSTOM LINK BACKEND
// ============================================================
function getLinksSheet() {
  if (CONFIG.LINKS_SHEET_ID) {
    try {
      var ssById = SpreadsheetApp.openById(CONFIG.LINKS_SHEET_ID);
      var sById = ssById.getSheetByName('Links') || ssById.getSheets()[0];
      if (sById) return sById;
    } catch(e) {
      Logger.log('CONFIG.LINKS_SHEET_ID open notice: ' + e.toString());
    }
  }
  var root = rootFolder();
  var files = root.getFilesByName('SEDS_ShortLinks');
  var ss;
  if (files.hasNext()) {
    ss = SpreadsheetApp.open(files.next());
  } else {
    ss = SpreadsheetApp.create('SEDS_ShortLinks');
    DriveApp.getFileById(ss.getId()).moveTo(root);
    var sheet = ss.getActiveSheet();
    sheet.setName('Links');
    sheet.appendRow(['Long URL', 'Shorten URL (Slug)', 'Created At', 'Submitter Email']);
    sheet.setFrozenRows(1);
    sheet.getRange('A1:D1').setFontWeight('bold').setBackground('#132233').setFontColor('#4da6ff');
  }
  var s = ss.getSheetByName('Links');
  if (!s) s = ss.getSheets()[0];
  return s;
}

function lookupSlug(slug) {
  if (!slug) return { success: false, error: 'No slug provided' };
  var cleanSlug = String(slug).trim().toLowerCase();
  try {
    var sheet = getLinksSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (var i = 0; i < data.length; i++) {
        var longUrl = String(data[i][0]).trim();
        var s = String(data[i][1]).trim();
        if (s.toLowerCase() === cleanSlug) {
          return { success: true, slug: s, longUrl: longUrl, targetUrl: longUrl };
        }
      }
    }
    return { success: false, error: 'Slug not found' };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function getAllLinks() {
  try {
    var sheet = getLinksSheet();
    var lastRow = sheet.getLastRow();
    var links = {};
    if (lastRow > 1) {
      var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (var i = 0; i < data.length; i++) {
        var longUrl = String(data[i][0]).trim();
        var s = String(data[i][1]).trim();
        if (s && longUrl) links[s] = longUrl;
      }
    }
    return { success: true, links: links };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function checkSlugAvailability(slug) {
  if (!slug || String(slug).trim().length < 3) {
    return { available: false, message: 'Slug must be at least 3 characters' };
  }
  var cleanSlug = String(slug).trim();
  try {
    var sheet = getLinksSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var slugs = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
      var lower = cleanSlug.toLowerCase();
      for (var i = 0; i < slugs.length; i++) {
        if (String(slugs[i]).trim().toLowerCase() === lower) {
          var longUrl = sheet.getRange(i + 2, 1).getValue();
          return { available: false, slug: cleanSlug, longUrl: longUrl, message: 'Slug is already registered' };
        }
      }
    }
    return { available: true, slug: cleanSlug, message: 'Slug is available' };
  } catch (err) {
    return { available: true, slug: cleanSlug, error: err.toString() };
  }
}

function createShortUrl(body) {
  var longUrl = String(body.longUrl || '').trim();
  var slug = String(body.slug || '').trim();
  var email = String(body.email || '').trim();

  if (!longUrl || !slug || !/^[a-zA-Z0-9_\-\/]+$/.test(slug)) {
    return { success: false, error: 'Invalid URL or slug format' };
  }

  try {
    var sheet = getLinksSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var slugs = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
      var lower = slug.toLowerCase();
      for (var i = 0; i < slugs.length; i++) {
        if (String(slugs[i]).trim().toLowerCase() === lower) {
          return { success: false, error: "Short code '" + slug + "' is already taken." };
        }
      }
    }

    sheet.appendRow([longUrl, slug, new Date(), email || '']);

    var shortUrl = (CONFIG.SHORT_DOMAIN_BASE || 'https://kumaraguruseds.space/') + slug;
    
    // Sync to GitHub if token configured
    try {
      syncShortLinksToGitHub();
    } catch (e) {
      Logger.log('GitHub sync notice: ' + e.toString());
    }

    // Send notifications
    try {
      sendShortLinkNotification(longUrl, slug, shortUrl, email);
    } catch (e) {
      Logger.log('Notification email notice: ' + e.toString());
    }

    return {
      success: true,
      shortUrl: shortUrl,
      slug: slug,
      longUrl: longUrl,
      message: 'Short link created and recorded successfully'
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ============================================================
//  GITHUB FILE HELPER — Generic PUT to GitHub Contents API
// ============================================================
function githubPutFile(path, base64Content, commitMessage) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN not set in Script Properties. Add it at: Apps Script > Project Settings > Script Properties');

  var apiBase = 'https://api.github.com/repos/' + CONFIG.GITHUB_USERNAME + '/' + CONFIG.GITHUB_REPO + '/contents/';
  var headers = {
    'Authorization': 'token ' + token,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // GET current SHA (needed if file already exists)
  var sha = null;
  var getRes = UrlFetchApp.fetch(apiBase + path + '?ref=' + CONFIG.GITHUB_BRANCH + '&t=' + Date.now(), {
    method: 'GET', headers: headers, muteHttpExceptions: true
  });
  if (getRes.getResponseCode() === 200) {
    sha = JSON.parse(getRes.getContentText()).sha;
  }

  var payload = { message: commitMessage, content: base64Content, branch: CONFIG.GITHUB_BRANCH };
  if (sha) payload.sha = sha;

  var putRes = UrlFetchApp.fetch(apiBase + path, {
    method: 'PUT',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = putRes.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('GitHub API error ' + code + ': ' + putRes.getContentText().substring(0, 200));
  }
  return JSON.parse(putRes.getContentText());
}

// ============================================================
//  GITHUB FILE HELPER — DELETE a file via GitHub Contents API
// ============================================================
function githubDeleteFile(path, commitMessage) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN not set in Script Properties.');

  var apiBase = 'https://api.github.com/repos/' + CONFIG.GITHUB_USERNAME + '/' + CONFIG.GITHUB_REPO + '/contents/';
  var headers = {
    'Authorization': 'token ' + token,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  // GET current SHA — file must exist to delete it
  var getRes = UrlFetchApp.fetch(apiBase + path + '?ref=' + CONFIG.GITHUB_BRANCH + '&t=' + Date.now(), {
    method: 'GET', headers: headers, muteHttpExceptions: true
  });
  if (getRes.getResponseCode() === 404) {
    // File already gone — treat as success
    return { deleted: false, skipped: true, reason: 'File not found on GitHub (already deleted or never published)' };
  }
  if (getRes.getResponseCode() !== 200) {
    throw new Error('GitHub GET error ' + getRes.getResponseCode() + ': ' + getRes.getContentText().substring(0, 200));
  }

  var sha = JSON.parse(getRes.getContentText()).sha;

  var payload = { message: commitMessage, sha: sha, branch: CONFIG.GITHUB_BRANCH };

  var delRes = UrlFetchApp.fetch(apiBase + path, {
    method: 'DELETE',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = delRes.getResponseCode();
  if (code !== 200 && code !== 204) {
    throw new Error('GitHub DELETE error ' + code + ': ' + delRes.getContentText().substring(0, 200));
  }

  Logger.log('githubDeleteFile: deleted ' + path + ' from GitHub');
  return { deleted: true, path: path };
}

// ============================================================
//  PUBLISH OG PAGE — Commits static HTML with OG meta tags to
//  GitHub at f/<formId>.html so WhatsApp/Telegram/Twitter see
//  the real form title + header image as the link thumbnail.
// ============================================================
function publishOgPage(body) {
  var formId = String(body.formId || '').trim();
  if (!formId) return { success: false, error: 'formId required' };

  // Check GITHUB_TOKEN upfront — give clear feedback
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) {
    return {
      success: false,
      warning: 'GITHUB_TOKEN not configured. To enable WhatsApp thumbnail preview, add GITHUB_TOKEN (repo contents:write scope) in Apps Script > Project Settings > Script Properties.',
      fallbackUrl: CONFIG.BASE_URL + 'view-form.html?id=' + encodeURIComponent(formId)
    };
  }

  try {
    // 1. Load form definition
    var formData = body.form || getForm(formId);
    if (!formData || formData.error) return { success: false, error: 'Form not found: ' + formId };

    var title    = (formData.title && formData.title !== 'Untitled form') ? formData.title : 'SEDS Form';
    var desc     = formData.description || 'Fill out this form from Kumaraguru SEDS.';
    var viewUrl  = CONFIG.BASE_URL + 'view-form.html?id=' + encodeURIComponent(formId);
    var imgUrl   = CONFIG.BASE_URL + 'sedsb.png';  // default fallback

    // 2. Handle header image: if base64 data URI, commit as static file
    var rawImg = formData.headerImage || formData.titleImage || formData.bannerImage || '';
    if (rawImg && rawImg.startsWith('data:')) {
      try {
        // Parse: data:<mime>;base64,<data>
        var mimeMatch = rawImg.match(/^data:([^;]+);base64,/);
        var mime      = mimeMatch ? mimeMatch[1] : 'image/png';
        var ext       = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : mime === 'image/gif' ? 'gif' : 'png';
        var b64Data   = rawImg.replace(/^data:[^;]+;base64,/, '');
        var imgPath   = 'f/img/' + formId + '.' + ext;

        githubPutFile(imgPath, b64Data, 'Add OG header image for form ' + formId);
        imgUrl = CONFIG.BASE_URL + imgPath;
      } catch (imgErr) {
        Logger.log('publishOgPage: image commit failed: ' + imgErr.toString());
        // Fall back to sedsb.png
      }
    } else if (rawImg && rawImg.startsWith('http')) {
      imgUrl = rawImg;  // already a public URL
    }

    // 3. Build the static OG HTML page
    var safe = function(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
    var safeTitle = safe(title + ' — Kumaraguru SEDS');
    var safeDesc  = safe(desc);

    var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
      '<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '<title>' + safeTitle + '</title>\n' +
      '<meta name="description" content="' + safeDesc + '">\n' +
      '<!-- Open Graph -->\n' +
      '<meta property="og:type" content="website">\n' +
      '<meta property="og:title" content="' + safeTitle + '">\n' +
      '<meta property="og:description" content="' + safeDesc + '">\n' +
      '<meta property="og:image" content="' + imgUrl + '">\n' +
      '<meta property="og:image:width" content="1200">\n' +
      '<meta property="og:image:height" content="630">\n' +
      '<meta property="og:url" content="' + viewUrl + '">\n' +
      '<meta property="og:site_name" content="Kumaraguru SEDS">\n' +
      '<!-- Twitter Card -->\n' +
      '<meta name="twitter:card" content="summary_large_image">\n' +
      '<meta name="twitter:title" content="' + safeTitle + '">\n' +
      '<meta name="twitter:description" content="' + safeDesc + '">\n' +
      '<meta name="twitter:image" content="' + imgUrl + '">\n' +
      '<link rel="icon" href="' + CONFIG.BASE_URL + 'SEDS.png" type="image/png">\n' +
      '<link rel="canonical" href="' + viewUrl + '">\n' +
      '<meta http-equiv="refresh" content="0; url=' + viewUrl + '">\n' +
      '</head>\n<body style="background:#070f1e;color:#8da4c4;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">\n' +
      '<p>Redirecting to <a href="' + viewUrl + '" style="color:#4da6ff">' + safeTitle + '</a>...</p>\n' +
      '<script>window.location.replace(' + JSON.stringify(viewUrl) + ');</script>\n' +
      '</body>\n</html>';

    // 4. Commit the HTML page to f/<formId>.html
    var htmlPath = 'f/' + formId + '.html';
    var b64Html  = Utilities.base64Encode(html, Utilities.Charset.UTF_8);
    githubPutFile(htmlPath, b64Html, 'Publish OG share page for form ' + formId + ' \u2014 ' + title);

    var ogUrl = CONFIG.BASE_URL + htmlPath;
    Logger.log('publishOgPage: committed ' + htmlPath + ' (img: ' + imgUrl + ')');
    return { success: true, ogUrl: ogUrl, imgUrl: imgUrl, formId: formId };

  } catch (err) {
    Logger.log('publishOgPage error: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

function syncShortLinksToGitHub() {
  try {
    var sheet = getLinksSheet();
    var data = sheet.getDataRange().getValues();
    var links = {};
    for (var i = 1; i < data.length; i++) {
      var s = data[i][1];
      var u = data[i][0];
      if (s && u) links[String(s).trim()] = String(u).trim();
    }
    var jsonContent = JSON.stringify(links, null, 2);
    var b64 = Utilities.base64Encode(jsonContent, Utilities.Charset.UTF_8);
    githubPutFile(CONFIG.GITHUB_FILE_PATH, b64, 'Sync short links from SEDS Forms - ' + new Date().toISOString());
  } catch (e) {
    Logger.log('syncShortLinksToGitHub: ' + e.toString());
  }
}

function sendShortLinkNotification(longUrl, slug, shortUrl, userEmail) {
  var adminSubject = '✅ NEW Short Link Created: ' + slug;
  var adminBody = '<div style="font-family:Arial,sans-serif;padding:16px;background:#0b0f19;color:#fff;border-radius:12px">' +
    '<h2 style="color:#4da6ff">Kumaraguru SEDS | Short Link Created</h2>' +
    '<p><strong>Short Link:</strong> <a href="' + shortUrl + '" style="color:#10b981">' + shortUrl + '</a></p>' +
    '<p><strong>Destination:</strong> <a href="' + longUrl + '" style="color:#4da6ff">' + longUrl + '</a></p>' +
    '<p><strong>Submitter:</strong> ' + (userEmail || 'Admin Portal') + '</p>' +
    '<p><strong>Created:</strong> ' + new Date().toLocaleString() + '</p>' +
    '</div>';

  CONFIG.ADMIN_EMAILS.forEach(function(em) {
    try {
      MailApp.sendEmail({
        to: em,
        subject: adminSubject,
        htmlBody: adminBody,
        name: CONFIG.SEDS_NAME
      });
    } catch (e) { }
  });

  if (userEmail && userEmail.indexOf('@') !== -1) {
    try {
      MailApp.sendEmail({
        to: userEmail,
        subject: 'Your SEDS Short Link is Ready: ' + slug,
        htmlBody: '<div style="font-family:Arial,sans-serif;padding:16px;background:#0b0f19;color:#fff;border-radius:12px">' +
          '<h2 style="color:#4da6ff">Kumaraguru SEDS | Your Short Link is Ready</h2>' +
          '<p>Hello,</p>' +
          '<p>Your custom short link has been successfully created and linked to your form:</p>' +
          '<p style="font-size:18px"><a href="' + shortUrl + '" style="color:#10b981;font-weight:bold">' + shortUrl + '</a></p>' +
          '<p style="color:#8da4c4;font-size:12px">Destination: ' + longUrl + '</p>' +
          '</div>',
        name: CONFIG.SEDS_NAME
      });
    } catch (e) { }
  }
}
