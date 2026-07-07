import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reviewContentDir = path.join(__dirname, '../public/review-content');

// Ensure directory exists
if (!fs.existsSync(reviewContentDir)) {
  fs.mkdirSync(reviewContentDir, { recursive: true });
}

// Generate mock data since github repo is inaccessible
const categories = [
  { id: 'core-java', name: 'Core Java', icon: '☕' },
  { id: 'react', name: 'React', icon: '⚛️' },
  { id: 'python', name: 'Python', icon: '🐍' },
  { id: 'javascript', name: 'JavaScript', icon: '💛' },
  { id: 'database', name: 'Database', icon: '💽' },
  { id: 'git', name: 'Git', icon: '🐙' }
];

const topics = [];

categories.forEach(category => {
  for (let i = 1; i <= 5; i++) {
    const topicId = `${category.id}-topic-${i}`;
    topics.push({
      id: topicId,
      categoryId: category.id,
      categoryName: category.name,
      icon: category.icon,
      title: `${category.name} - Bài học số ${i}`
    });

    const markdownContent = `
# ${category.name} - Bài học số ${i}

Đây là nội dung bài học mô phỏng cho **${category.name}**.

## Ví dụ Code

\`\`\`${category.id === 'core-java' ? 'java' : category.id === 'react' ? 'jsx' : category.id === 'python' ? 'python' : 'javascript'}
// Code block mẫu
function example() {
  console.log("Hello from ${category.name} bài ${i}");
}
\`\`\`

## Bảng so sánh

| Thuộc tính | Giá trị |
| ---------- | ------- |
| Topic ID   | ${topicId} |
| Category   | ${category.name} |

- Điểm 1
- Điểm 2
- Điểm 3
`;
    fs.writeFileSync(path.join(reviewContentDir, `${topicId}.md`), markdownContent.trim());
  }
});

fs.writeFileSync(path.join(reviewContentDir, 'topics.json'), JSON.stringify(topics, null, 2));

console.log('Mock content generated successfully in public/review-content!');
