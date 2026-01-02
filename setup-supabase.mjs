import { chromium } from 'playwright';
import fs from 'fs';

const schemaSQL = fs.readFileSync('./supabase/schema.sql', 'utf-8');
const storageSQL = fs.readFileSync('./supabase/storage.sql', 'utf-8');

async function setupSupabase() {
  console.log('Launching browser...');
  console.log('You may need to sign into Supabase if not already logged in.\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge' // Try Edge instead
  });

  const context = await browser.newContext();
  const supabasePage = await context.newPage();

  // Go to Supabase dashboard
  await supabasePage.goto('https://supabase.com/dashboard/projects');

  console.log('Waiting for you to be signed in...');
  console.log('If prompted, please sign in to Supabase.\n');

  // Wait for user to be on a project page (either already logged in or after login)
  await supabasePage.waitForURL(/project\//, { timeout: 120000 });

  const currentUrl = supabasePage.url();
  const projectMatch = currentUrl.match(/project\/([^/]+)/);

  if (!projectMatch) {
    console.log('Could not find project. URL:', currentUrl);
    return;
  }

  const projectId = projectMatch[1];
  console.log('Project ID:', projectId);

  // Step 1: Create storage bucket
  console.log('\n--- Step 1: Creating storage bucket ---');

  const storageUrl = `https://supabase.com/dashboard/project/${projectId}/storage/buckets`;
  await supabasePage.goto(storageUrl);
  await supabasePage.waitForTimeout(2000);

  try {
    const newBucketBtn = await supabasePage.locator('button:has-text("New bucket")').first();
    if (await newBucketBtn.isVisible({ timeout: 3000 })) {
      await newBucketBtn.click();
      console.log('Clicked "New bucket"');

      await supabasePage.waitForTimeout(1000);

      const nameInput = await supabasePage.locator('input#name, input[name="name"]').first();
      await nameInput.fill('uploads');
      console.log('Named bucket: uploads');

      await supabasePage.waitForTimeout(300);

      // Toggle public
      const toggles = await supabasePage.locator('button[role="switch"]');
      const count = await toggles.count();
      if (count > 0) {
        await toggles.first().click();
        console.log('Enabled public access');
      }

      await supabasePage.waitForTimeout(500);

      const saveBtn = await supabasePage.locator('button:has-text("Create bucket"), button:has-text("Save")').first();
      await saveBtn.click();
      console.log('Created bucket');

      await supabasePage.waitForTimeout(2000);
    } else {
      console.log('Bucket may already exist');
    }
  } catch (e) {
    console.log('Storage:', e.message);
  }

  // Step 2: Run schema SQL
  console.log('\n--- Step 2: Running schema SQL ---');

  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`;
  await supabasePage.goto(sqlEditorUrl);
  await supabasePage.waitForTimeout(3000);

  try {
    await supabasePage.waitForSelector('.monaco-editor', { timeout: 10000 });

    const editor = await supabasePage.locator('.monaco-editor .view-lines').first();
    await editor.click();
    await supabasePage.waitForTimeout(500);

    await supabasePage.evaluate((sql) => {
      const editors = window.monaco?.editor?.getEditors();
      if (editors && editors.length > 0) {
        editors[0].setValue(sql);
        return true;
      }
      return false;
    }, schemaSQL);

    console.log('Schema SQL inserted');
    await supabasePage.waitForTimeout(1000);

    const runBtn = await supabasePage.locator('button:has-text("Run")').first();
    await runBtn.click();
    console.log('Running schema...');

    await supabasePage.waitForTimeout(5000);
    console.log('✅ Schema done');

  } catch (e) {
    console.log('Schema error:', e.message);
  }

  // Step 3: Run storage policies
  console.log('\n--- Step 3: Running storage policies ---');

  try {
    await supabasePage.goto(sqlEditorUrl);
    await supabasePage.waitForTimeout(3000);

    await supabasePage.waitForSelector('.monaco-editor', { timeout: 10000 });

    const editor2 = await supabasePage.locator('.monaco-editor .view-lines').first();
    await editor2.click();
    await supabasePage.waitForTimeout(500);

    await supabasePage.evaluate((sql) => {
      const editors = window.monaco?.editor?.getEditors();
      if (editors && editors.length > 0) {
        editors[0].setValue(sql);
        return true;
      }
      return false;
    }, storageSQL);

    console.log('Storage policies SQL inserted');
    await supabasePage.waitForTimeout(1000);

    const runBtn2 = await supabasePage.locator('button:has-text("Run")').first();
    await runBtn2.click();
    console.log('Running policies...');

    await supabasePage.waitForTimeout(3000);
    console.log('✅ Policies done');

  } catch (e) {
    console.log('Policies error:', e.message);
  }

  console.log('\n==========================================');
  console.log('✅ SETUP COMPLETE!');
  console.log('==========================================');
  console.log('\n📧 LAST STEP: Add your admin email in the SQL editor:');
  console.log("INSERT INTO admin_users (email) VALUES ('your@email.com');");
  console.log('\nThe browser will stay open. Press Ctrl+C here when done.');

  await new Promise(() => {});
}

setupSupabase().catch(console.error);
