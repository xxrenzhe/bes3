const fs = require('fs');
const path = require('path');

const replacements = [
  // 1. BLUF
  { match: />BLUF:</g, replace: '>The Bottom Line:<' },
  // 2. Decision Lane / Entity
  { match: /category lane/gi, replace: 'category' },
  { match: /Decision Lane/gi, replace: 'Category' },
  { match: /adjacent coverage/gi, replace: 'similar choices' },
  { match: /exact entity match/gi, replace: 'exact model match' },
  { match: /closest active decision lanes and alternative category hubs/g, replace: 'closest trusted alternatives' },
  { match: /Search Fallback Engine/g, replace: 'Search Alternatives' },
  // 3. Editorial Verdict / Decision Framework
  { match: /Editorial Verdict/g, replace: 'Our Top Pick' },
  { match: /Decision Framework/g, replace: 'What to Consider' },
  // 4. Cadence / Intent
  { match: /Cadence/g, replace: 'How often?' },
  { match: /"Intent"/g, replace: '"Alert Type"' }, 
  { match: />Intent</g, replace: '>Alert Type<' },
  // 5. Semantic Clustering
  { match: /Our algorithmic pipeline does not currently have a dedicated entry for "\{query\}". However, based on semantic clustering, we have generated the closest active decision lanes and alternative category hubs below to ensure you find the correct buyer fit./g, replace: "We haven't reviewed that exact model yet, but here are the closest trusted alternatives in that category." },
  // 6. Macro Database
  { match: /normalizing thousands of data points across the \{monthYear\} macro database/g, replace: 'analyzing real buyer feedback across the web, not sponsored ads' },
  // 7. Confidence Signals
  { match: /Confidence signals:/g, replace: 'Why trust this?' },
  // 8. Value Signal / Buyer Confidence
  { match: /'Value signal'/g, replace: "'Bang for your buck'" },
  { match: /'Buyer confidence'/g, replace: "'Owner Satisfaction'" },
  // 9. Workspace / Decision Boards
  { match: /Shortlist Workspace/gi, replace: 'My Saved Picks' },
  { match: /Side-by-side decision boards/gi, replace: 'Compare Finalists' },
  { match: /Side-by-side decision board/gi, replace: 'Compare Finalists' },
  // 10. Taxonomy Navigation
  { match: /Shortlist Builder/g, replace: 'Top Rated Tech' },
  { match: /Deep-Dive Reviews/g, replace: 'Help me choose' },
  { match: /Product Comparisons/g, replace: 'Head-to-Head' },
  { match: /Price Tracking/g, replace: 'Sale Alerts' },
  // 11. Freshness
  { match: /Review freshness/gi, replace: 'Last Updated' },
  { match: /Freshness Locked/g, replace: 'Prices Current As Of' },
  { match: />Freshness</gi, replace: '>Last Updated<' },
  // 12. Category Brief / Watchlist
  { match: /Category Brief/g, replace: 'Weekly Top Picks' },
  { match: /Watchlist/g, replace: 'Price Drop Alerts' },
  { match: /watchlist/g, replace: 'alert list' },
  // 13. Peer Product / Supporting Guide
  { match: /Peer Product/g, replace: 'Similar Options' },
  { match: /Supporting Guide/g, replace: 'Buying Guide' },
  // 14. Decision Principles
  { match: /Decision Principles/g, replace: 'Why Trust Bes3?' },
  { match: /'Intent first'/g, replace: "'No endless scrolling'" },
  { match: /'Same-category compare'/g, replace: "'Honest comparisons'" },
  { match: /'Low-pressure next step'/g, replace: "'Alerts, not spam'" },
  // 15. Raw Specs Dump
  { match: />Decision Checklist</g, replace: '>Technical Details<' },
  { match: />Specs Snapshot</g, replace: '>Key Specifications<' },
  // 16. Useful value proposition
  { match: /Useful value proposition/g, replace: 'Great battery life' },
  // 17. Analyst Disclaimers
  { match: /Use the winner only if it fits your actual requirements\./g, replace: 'Best price found today.' },
  { match: /Decision note: move fast only if this still fits your actual use case and budget\./g, replace: 'Best price found today.' },
  // Extra: "Algorithmic Data Verification"
  { match: /Algorithmic Data Verification/g, replace: 'How We Rate Products' },
  { match: /E-E-A-T Trust Shield/g, replace: 'Our Promise' }
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