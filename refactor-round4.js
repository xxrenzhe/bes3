const fs = require('fs');
const path = require('path');

const replacements = [
  // 18. Funnel (Marketing Jargon)
  { match: /mid-funnel shoppers/gi, replace: 'shoppers who know what they want' },
  { match: /mid-funnel/gi, replace: 'ready to decide' },
  { match: /low-trust affiliate funnel/gi, replace: 'clickbait scam' },
  
  // 19. Signals & Freshness (Data Labels)
  { match: /freshness, best-for, and skip-if signals/gi, replace: "'Updated' date, 'Best For', and 'Reasons to Skip'" },
  { match: /skip-if signals/gi, replace: 'Reasons to Skip' },
  { match: /best-for signals/gi, replace: 'Best For recommendations' },

  // 20. Heuristics (Cognitive Psychology Jargon)
  { match: /buying heuristics/gi, replace: 'buying advice' },
  { match: /heuristic level/gi, replace: 'basic education level' },
  { match: /the heuristics that matter/gi, replace: 'the features that actually matter' },
  
  // Clean up any remaining "Land the decision" awkwardly worded UX manifestos
  { match: /Land the decision without restarting research./gi, replace: 'Comparison Workflows' },
  { match: /Keep the related pages one click away./gi, replace: 'Related Categories & Guides' },
  { match: /Keep the decision chain intact./gi, replace: 'Compare & Next Steps' },
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    replacements.forEach(({ match, replace }) => {
      content = content.replace(match, replace);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
