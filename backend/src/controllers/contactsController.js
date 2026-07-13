const { pool } = require('../config/db');
const { normalizePhoneNumber } = require('../utils/phoneValidator');
const { Readable } = require('stream');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const path = require('path');
const { getSettings } = require('../config/settings');

/**
 * Utility to extract column values from a row in a case-insensitive, space-flexible manner.
 * Helps map variant headers like "Phone Number", "phoneNumber", "phone" to key fields.
 */
function getColumnValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
    const foundKey = Object.keys(row).find(
      (k) => k.toLowerCase().replace(/[\s_\-]/g, '') === key.toLowerCase().replace(/[\s_\-]/g, '')
    );
    if (foundKey !== undefined) return row[foundKey];
  }
  return null;
}

/**
 * Parses a CSV file buffer.
 */
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer);
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

/**
 * Parses an Excel sheet buffer.
 */
function parseXLSX(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return [];
  }
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet);
}

/**
 * Handles CSV/XLSX contact uploads.
 */
async function handleContactUpload(req, res) {
  try {
    const consentConfirmed = req.body.consent_confirmed === true || req.body.consent_confirmed === 'true';
    if (!consentConfirmed) {
      return res.status(400).json({ error: 'Please confirm that all contacts in this list have given consent to receive WhatsApp messages before uploading.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select a .csv or .xlsx file.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let parsedRows = [];

    // Parse according to file type
    if (ext === '.csv') {
      parsedRows = await parseCSV(req.file.buffer);
    } else if (ext === '.xlsx' || ext === '.xls') {
      parsedRows = parseXLSX(req.file.buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Only .csv and .xlsx files are supported.' });
    }

    // Parse default tags from body (comma separated)
    const defaultTags = req.body.tags
      ? req.body.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0)
      : [];

    let total = parsedRows.length;
    let valid = 0;
    let invalid = 0;
    let duplicates = 0;

    const seenPhones = new Set();
    const validContactsToInsert = [];

    const settings = getSettings();
    const defaultCountryCode = settings ? settings.defaultCountryCode : '91';

    // Loop through parsed rows to validate and deduplicate
    for (const row of parsedRows) {
      const rawPhone = getColumnValue(row, ['phone_number', 'phone', 'mobile', 'contact', 'phonenumber']);
      const name = getColumnValue(row, ['name', 'first_name', 'fullname', 'full_name']);
      const company = getColumnValue(row, ['company', 'organization', 'org']);
      const custom1 = getColumnValue(row, ['custom1', 'var1', 'variable1']);
      const custom2 = getColumnValue(row, ['custom2', 'var2', 'variable2']);
      
      // Look for a tag/tags column in row
      const rowTagsRaw = getColumnValue(row, ['tags', 'tag', 'segment', 'segments']);
      const rowTags = rowTagsRaw
        ? String(rowTagsRaw).split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0)
        : [];
      
      const combinedTags = Array.from(new Set([...defaultTags, ...rowTags]));

      const normalizedPhone = normalizePhoneNumber(rawPhone, defaultCountryCode);

      if (!normalizedPhone) {
        invalid++;
        continue;
      }

      if (seenPhones.has(normalizedPhone)) {
        duplicates++;
        continue;
      }

      seenPhones.add(normalizedPhone);
      valid++;

      validContactsToInsert.push({
        phone_number: normalizedPhone,
        name: name ? String(name).trim() : null,
        company: company ? String(company).trim() : null,
        custom1: custom1 ? String(custom1).trim() : null,
        custom2: custom2 ? String(custom2).trim() : null,
        tags: combinedTags
      });
    }

    // Generate a unique list name using a readable timestamp
    const timestamp = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
    const listName = `Upload - ${timestamp}`;

    // Create a client from the pool to execute contact insert in a transaction
    const client = await pool.connect();
    let listId;
    try {
      await client.query('BEGIN');

      // Create the contact list record
      const listResult = await client.query(
        `INSERT INTO contact_lists (name, total_count, valid_count, invalid_count, duplicate_count)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [listName, total, valid, invalid, duplicates]
      );
      listId = listResult.rows[0].id;

      // Batch insert contacts (max 1000 per query to avoid PostgreSQL parameter limits)
      const BATCH_SIZE = 1000;
      for (let i = 0; i < validContactsToInsert.length; i += BATCH_SIZE) {
        const batch = validContactsToInsert.slice(i, i + BATCH_SIZE);
        const valuePlaceholders = [];
        const queryValues = [];
        let paramIndex = 1;

        for (const contact of batch) {
          valuePlaceholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
          queryValues.push(
            listId,
            contact.phone_number,
            contact.name,
            contact.company,
            contact.custom1,
            contact.custom2,
            contact.tags,
            true
          );
          paramIndex += 8;
        }

        const insertQueryText = `
          INSERT INTO contacts (list_id, phone_number, name, company, custom1, custom2, tags, has_consent)
          VALUES ${valuePlaceholders.join(', ')}
        `;
        await client.query(insertQueryText, queryValues);
      }

      await client.query('COMMIT');
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }

    // Limit preview list to first 50 contacts
    const previewContacts = validContactsToInsert.slice(0, 50);

    return res.json({
      listId,
      listName,
      total,
      valid,
      invalid,
      duplicates,
      contacts: previewContacts,
    });

  } catch (error) {
    console.error('Error handling contact upload:', error);
    return res.status(500).json({ error: 'Failed to process file and import contacts' });
  }
}

module.exports = {
  handleContactUpload,
};
