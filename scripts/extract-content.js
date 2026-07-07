import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, '../test.html');
const reviewContentDir = path.join(__dirname, '../public/review-content');

if (!fs.existsSync(reviewContentDir)) {
  fs.mkdirSync(reviewContentDir, { recursive: true });
}

// 1. Read test.html
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// 2. Extract the script content
// We look for 'const TOPICS' to start, and end before </script>
const scriptStartIdx = htmlContent.indexOf('const TOPICS =');
const scriptEndIdx = htmlContent.lastIndexOf('</script>');

if (scriptStartIdx === -1 || scriptEndIdx === -1) {
  console.error('Could not find JS data in test.html');
  process.exit(1);
}

const scriptDataRaw = htmlContent.substring(scriptStartIdx, scriptEndIdx);
const splitKeyword = 'let activeKey = null;';
let scriptData = scriptDataRaw.split(splitKeyword)[0] || scriptDataRaw;
scriptData += '\nthis.TOPICS = TOPICS;\nthis.DETAIL = DETAIL;\n';

const sandbox = {};
vm.createContext(sandbox);

try {
  vm.runInContext(scriptData, sandbox);
} catch (e) {
  console.error('Error evaluating script data:', e);
  process.exit(1);
}

const { TOPICS, DETAIL } = sandbox;

if (!TOPICS || !DETAIL) {
  console.error('Failed to extract TOPICS or DETAIL');
  process.exit(1);
}

// 4. Save topics.json
fs.writeFileSync(
  path.join(reviewContentDir, 'topics.json'),
  JSON.stringify(TOPICS, null, 2),
  'utf-8'
);

// Helper function to safely convert name to filename
const slugify = (text) => {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '') // remove non-alphanumeric chars
    .replace(/[\s_-]+/g, '-') // replace spaces and underscores with hyphen
    .replace(/^-+|-+$/g, ''); // trim hyphens
};

const keyToCatSlug = {};
TOPICS.forEach(cat => {
  const catSlug = slugify(cat.title);
  cat.topics.forEach(topic => {
    keyToCatSlug[topic.name] = catSlug;
    if (topic.subs) {
      topic.subs.forEach(sub => {
        keyToCatSlug[sub] = catSlug;
      });
    }
  });
});

// 5. Generate Markdown files from DETAIL
let fileCount = 0;

for (const [key, data] of Object.entries(DETAIL)) {
  const safeKey = slugify(key) || `topic-${fileCount}`;
  const catSlug = keyToCatSlug[key] || '';
  
  const targetDir = path.join(reviewContentDir, catSlug);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  let md = [];
  
  // Title
  if (data.title) md.push(`# ${data.title}\n`);
  
  // Breadcrumb
  if (data.crumb) md.push(`**Breadcrumb:** ${data.crumb}\n`);
  
  // Summary
  if (data.summary) {
    // Replace <strong> with markdown bold
    let sum = data.summary.replace(/<strong>/g, '**').replace(/<\/strong>/g, '**');
    md.push(`> ${sum}\n`);
  }
  
  // Points
  if (data.points && Array.isArray(data.points)) {
    md.push(`## Các điểm chính\n`);
    data.points.forEach(pt => {
      let ptStr = pt.replace(/<strong>/g, '**').replace(/<\/strong>/g, '**');
      ptStr = ptStr.replace(/<em>/g, '*').replace(/<\/em>/g, '*');
      md.push(`- ✦ ${ptStr}`);
    });
    md.push('');
  }
  
  // Code block
  if (data.code) {
    if (data.codeLabel) {
      md.push(`*${data.codeLabel}*`);
    }
    // Try to guess language based on key or title
    let lang = 'java';
    if (data.title && data.title.toLowerCase().includes('sql')) lang = 'sql';
    if (data.title && data.title.toLowerCase().includes('docker')) lang = 'dockerfile';
    
    // For XML/HTML
    if (data.code.includes('</')) lang = 'xml';
    
    md.push(`\`\`\`${lang}\n${data.code}\n\`\`\`\n`);
  }
  
  // Adapt
  if (data.adapt) {
    let ad = data.adapt.replace(/<code>/g, '\`').replace(/<\/code>/g, '\`');
    md.push(`### 💡 Lời khuyên thực tế\n\n${ad}\n`);
  }
  
  // Interview
  if (data.interview && Array.isArray(data.interview)) {
    md.push(`### ❓ Câu hỏi phỏng vấn\n`);
    data.interview.forEach(q => {
      md.push(`- **Q:** ${q}`);
    });
    md.push('');
  }
  
  fs.writeFileSync(
    path.join(targetDir, `${safeKey}.md`),
    md.join('\n'),
    'utf-8'
  );
  fileCount++;
}

console.log(`Successfully extracted topics.json and ${fileCount} markdown files into subfolders!`);
