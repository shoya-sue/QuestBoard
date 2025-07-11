const fs = require('fs-extra');
const path = require('path');

function parseMarkdown(filePath) {
  return new Promise(async (resolve, reject) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      if (!lines[0].startsWith('---')) {
        resolve(null);
        return;
      }
      
      let frontMatterEnd = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].startsWith('---')) {
          frontMatterEnd = i;
          break;
        }
      }
      
      if (frontMatterEnd === -1) {
        resolve(null);
        return;
      }
      
      const frontMatter = {};
      for (let i = 1; i < frontMatterEnd; i++) {
        const line = lines[i].trim();
        if (line) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          frontMatter[key.trim()] = value;
        }
      }
      
      const bodyLines = lines.slice(frontMatterEnd + 1);
      const body = bodyLines.join('\n').trim();
      
      const descriptionMatch = body.match(/##\s*依頼内容\s*\n([\s\S]*?)(?=\n##|$)/);
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';
      
      resolve({
        id: frontMatter.id,
        title: frontMatter.title,
        status: frontMatter.status,
        reward: frontMatter.reward,
        difficulty: frontMatter.difficulty,
        created_at: frontMatter.created_at,
        updated_at: frontMatter.updated_at,
        acceptedBy: frontMatter.acceptedBy,
        completedAt: frontMatter.completedAt,
        description: description,
        content: body
      });
    } catch (error) {
      reject(error);
    }
  });
}

function saveMarkdown(filePath, quest) {
  return new Promise(async (resolve, reject) => {
    try {
      const frontMatterLines = [
        '---',
        `id: ${quest.id}`,
        `title: ${quest.title}`,
        `status: ${quest.status}`,
        `reward: ${quest.reward}`,
        `difficulty: ${quest.difficulty}`,
        `created_at: ${quest.created_at}`,
        `updated_at: ${quest.updated_at}`
      ];
      
      if (quest.acceptedBy) {
        frontMatterLines.push(`acceptedBy: ${quest.acceptedBy}`);
      }
      if (quest.completedAt) {
        frontMatterLines.push(`completedAt: ${quest.completedAt}`);
      }
      
      frontMatterLines.push('---');
      const frontMatter = frontMatterLines.join('\n');
      
      const content = `${frontMatter}\n\n${quest.content}`;
      
      await fs.writeFile(filePath, content, 'utf-8');
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  parseMarkdown,
  saveMarkdown
};