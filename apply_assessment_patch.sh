#!/bin/bash

# Add the import statement after the beginnerFundamentalsPath import
sed -i "706 a import { postToolUseAssessment } from '../data/assessments/postToolUseAssessment';" apps/client/src/components/EducationalDashboard.vue

# Add the assessment to sampleAssessments object by replacing the closing } with },\n  post_tool_use: postToolUseAssessment
sed -i "816s/  }/  },\n  post_tool_use: postToolUseAssessment/" apps/client/src/components/EducationalDashboard.vue

echo "Successfully patched EducationalDashboard.vue with PostToolUse assessment"