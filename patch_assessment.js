#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the EducationalDashboard.vue file
const filePath = path.join(__dirname, 'apps/client/src/components/EducationalDashboard.vue');
let content = fs.readFileSync(filePath, 'utf8');

// Add the import statement after line 706 (after beginnerFundamentalsPath import)
const importLine = "import { postToolUseAssessment } from '../data/assessments/postToolUseAssessment';";
const beginnerFundamentalsImport = "import { beginnerFundamentalsPath } from '../data/learningPaths';";
content = content.replace(
  beginnerFundamentalsImport,
  beginnerFundamentalsImport + '\n' + importLine
);

// Add the assessment to sampleAssessments object
// Find the closing of session_start and add post_tool_use
const sessionStartEnd = `    ]
  }
};`;

const sessionStartEndWithPostToolUse = `    ]
  },
  post_tool_use: postToolUseAssessment
};`;

content = content.replace(sessionStartEnd, sessionStartEndWithPostToolUse);

// Write the modified content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Successfully added PostToolUse assessment to EducationalDashboard.vue');