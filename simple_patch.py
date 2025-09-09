#!/usr/bin/env python3

import os

file_path = 'apps/client/src/components/EducationalDashboard.vue'

# Read the file
with open(file_path, 'r') as f:
    lines = f.readlines()

# Add import after line 706 (index 705)
import_line = "import { postToolUseAssessment } from '../data/assessments/postToolUseAssessment';\n"
lines.insert(707, import_line)  # Insert at index 707 (after beginnerFundamentalsPath import)

# Modify line 815 (now 816 due to added import) - change "  }" to "  },"
# And add the new assessment entry
for i, line in enumerate(lines):
    if i == 816 and line.strip() == "}":  # The closing brace of session_start
        lines[i] = "  },\n"
        lines.insert(i + 1, "  post_tool_use: postToolUseAssessment\n")
        break

# Write back
with open(file_path, 'w') as f:
    f.writelines(lines)

print("Patched successfully!")
print("Added import and assessment to EducationalDashboard.vue")