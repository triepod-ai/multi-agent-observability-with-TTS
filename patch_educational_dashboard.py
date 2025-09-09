#!/usr/bin/env python3

import re

# Read the current file
with open('apps/client/src/components/EducationalDashboard.vue', 'r') as f:
    content = f.read()

# 1. Add the import statement
import_pattern = r"(import { beginnerFundamentalsPath } from '\.\./data/learningPaths';)"
import_replacement = r"\1\nimport { postToolUseAssessment } from '../data/assessments/postToolUseAssessment';"
content = re.sub(import_pattern, import_replacement, content)

# 2. Add the assessment to sampleAssessments
assessment_pattern = r"(\s*)\]\s*\n(\s*)}\s*\n};"
assessment_replacement = r"\1]\n\2},\n\2post_tool_use: postToolUseAssessment\n};"
content = re.sub(assessment_pattern, assessment_replacement, content)

# Write back to file
with open('apps/client/src/components/EducationalDashboard.vue', 'w') as f:
    f.write(content)

print("Successfully patched EducationalDashboard.vue with PostToolUse assessment!")