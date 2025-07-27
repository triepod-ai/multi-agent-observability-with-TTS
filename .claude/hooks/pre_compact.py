#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = [
#   "requests>=2.32.3",
# ]
# ///

"""
PreCompact Hook - Intelligent Conversation Summarization

This hook runs before Claude compacts context, creating:
1. A detailed technical summary saved to a file
2. A brief executive summary sent to TTS via speak command

Uses the Codex Summarize utility for zero-token local summarization.
"""

import json
import os
import sys
import subprocess
import logging
from datetime import datetime
from pathlib import Path
import tempfile
import re

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler(os.path.expanduser('~/.claude/logs/pre_compact.log')),
        logging.StreamHandler()
    ]
)

def get_codex_summarize_path():
    """Find the codex-summarize.sh script"""
    # Known location based on search
    primary_path = "/home/bryan/setup-mcp-server.sh.APP/tests/export-codex/codex-summarize.sh"
    if os.path.exists(primary_path):
        return primary_path
    
    # Fallback: search for it
    try:
        result = subprocess.run(
            ["find", os.path.expanduser("~"), "-name", "codex-summarize.sh", "-type", "f"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            paths = result.stdout.strip().split('\n')
            if paths:
                return paths[0]
    except Exception as e:
        logging.error(f"Error searching for codex-summarize.sh: {e}")
    
    return None

def export_conversation():
    """Export current conversation to a temporary file"""
    try:
        # Create temporary file for conversation export
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
            temp_file = f.name
            
            # Get conversation from stdin or environment
            conversation_data = sys.stdin.read() if not sys.stdin.isatty() else ""
            
            # If no stdin, try to get from environment or hook data
            if not conversation_data:
                # Check for conversation in environment variables
                hook_data = os.environ.get('CLAUDE_HOOK_DATA', '{}')
                try:
                    data = json.loads(hook_data)
                    conversation_data = data.get('conversation', '')
                except:
                    conversation_data = ""
            
            if conversation_data:
                f.write(conversation_data)
                logging.info(f"Exported conversation to {temp_file} ({len(conversation_data)} bytes)")
                return temp_file
            else:
                logging.warning("No conversation data available")
                return None
                
    except Exception as e:
        logging.error(f"Error exporting conversation: {e}")
        return None

def generate_summaries(conversation_file, codex_path):
    """Generate both detailed and brief summaries using codex-summarize.sh"""
    summaries = {}
    
    # Get project name and timestamp for file naming
    project_name = os.path.basename(os.getcwd())
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create summaries directory if it doesn't exist
    summaries_dir = os.path.expanduser("~/.claude/summaries")
    os.makedirs(summaries_dir, exist_ok=True)
    
    try:
        # 1. Generate detailed technical summary (saved to file)
        tech_summary_file = os.path.join(summaries_dir, f"{project_name}_technical_{timestamp}.md")
        logging.info(f"Generating technical summary to {tech_summary_file}")
        
        tech_result = subprocess.run(
            [codex_path, "-t", "technical", "-o", tech_summary_file, conversation_file],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if tech_result.returncode == 0:
            summaries['technical_file'] = tech_summary_file
            logging.info(f"Technical summary saved to {tech_summary_file}")
        else:
            logging.error(f"Failed to generate technical summary: {tech_result.stderr}")
        
        # 2. Generate brief executive summary (for TTS)
        logging.info("Generating executive summary for TTS")
        
        exec_result = subprocess.run(
            [codex_path, "-t", "executive", conversation_file],
            capture_output=True,
            text=True,
            timeout=45
        )
        
        if exec_result.returncode == 0 and exec_result.stdout.strip():
            # Extract key points from executive summary for TTS
            exec_summary = exec_result.stdout.strip()
            
            # Parse the executive summary to extract actual content
            # Skip metadata lines and extract the core summary
            lines = exec_summary.split('\n')
            content_started = False
            summary_lines = []
            
            for line in lines:
                # Skip metadata lines (timestamps, version info, settings)
                if line.startswith('[') or line.startswith('---') or 'codex' in line.lower() or 'model:' in line or 'provider:' in line:
                    continue
                    
                # Look for the actual summary content
                if '**Executive Summary**' in line or '**Objective**' in line:
                    content_started = True
                    continue
                    
                if content_started and line.strip():
                    # Clean up the line - remove markdown formatting and technical jargon
                    clean_line = line.replace('**', '').replace('*', '').strip()
                    if clean_line and not clean_line.startswith('—'):
                        summary_lines.append(clean_line)
            
            # Create brief TTS summary from key points
            if summary_lines:
                # Look for actual content after the headers
                objective_content = ""
                outcome_content = ""
                current_section = ""
                
                for i, line in enumerate(summary_lines):
                    # Identify sections
                    if 'objective' in line.lower():
                        current_section = "objective"
                        # Get the content after the colon or on next line
                        if ':' in line:
                            content = line.split(':', 1)[1].strip()
                            if content:
                                objective_content = content
                        continue
                    elif 'outcome' in line.lower():
                        current_section = "outcome"
                        if ':' in line:
                            content = line.split(':', 1)[1].strip()
                            if content:
                                outcome_content = content
                        continue
                    
                    # Collect content for current section
                    if current_section == "objective" and not objective_content and line.strip():
                        objective_content = line.strip()
                    elif current_section == "outcome" and not outcome_content and line.strip():
                        outcome_content = line.strip()
                    
                    # Stop after getting both
                    if objective_content and outcome_content:
                        break
                
                # Build brief summary from extracted content
                if objective_content or outcome_content:
                    parts = []
                    if objective_content:
                        # Clean up the objective
                        obj_clean = re.sub(r'[‑–—-]+', '', objective_content)  # Remove dashes
                        obj_clean = re.sub(r'\s+', ' ', obj_clean).strip()
                        if obj_clean:
                            parts.append(f"Goal was {obj_clean.lower()}")
                    
                    if outcome_content:
                        # Clean up the outcome
                        out_clean = re.sub(r'[‑–—-]+', '', outcome_content)
                        out_clean = re.sub(r'\s+', ' ', out_clean).strip()
                        if out_clean:
                            parts.append(f"Achieved {out_clean.lower()}")
                    
                    if parts:
                        brief_summary = '. '.join(parts)
                    else:
                        brief_summary = "Session context saved successfully"
                else:
                    # Try to extract any meaningful first line
                    for line in summary_lines:
                        if len(line) > 20 and not any(skip in line.lower() for skip in ['objective', 'outcome', 'timeline', 'resources', 'risks']):
                            brief_summary = line.strip()
                            break
                    else:
                        brief_summary = "Session context saved successfully"
                
                # Final cleanup and length limit
                brief_summary = re.sub(r'\b\d{4,}\b', '', brief_summary)  # Remove long numbers
                brief_summary = re.sub(r'\s+', ' ', brief_summary).strip()
                
                # Ensure it's concise (max ~25 words)
                words = brief_summary.split()
                if len(words) > 25:
                    brief_summary = ' '.join(words[:25]) + "..."
                    
                summaries['executive_brief'] = brief_summary
            else:
                # Fallback if parsing fails
                summaries['executive_brief'] = f"Session saved for {project_name}"
            
            # Also save full executive summary
            exec_summary_file = os.path.join(summaries_dir, f"{project_name}_executive_{timestamp}.md")
            with open(exec_summary_file, 'w') as f:
                f.write(exec_summary)
            summaries['executive_file'] = exec_summary_file
            
            logging.info(f"Executive summary saved to {exec_summary_file}")
        else:
            logging.error(f"Failed to generate executive summary: {exec_result.stderr}")
            # Fallback brief summary
            summaries['executive_brief'] = f"Context compaction completed for {project_name}"
            
    except subprocess.TimeoutExpired:
        logging.error("Summary generation timed out")
        summaries['executive_brief'] = f"Context compaction completed for {project_name} (summary timeout)"
    except Exception as e:
        logging.error(f"Error generating summaries: {e}")
        summaries['executive_brief'] = f"Context compaction completed for {project_name}"
    
    return summaries

def send_to_tts(message):
    """Send brief summary to TTS via speak command"""
    try:
        engineer_name = os.environ.get('ENGINEER_NAME', 'Developer')
        
        # Keep it very brief and natural
        if "goal was" in message.lower() or "achieved" in message.lower():
            # Already formatted nicely
            full_message = f"{engineer_name}, compacting context. {message}"
        elif len(message) > 50:
            # Too long, just use generic message
            full_message = f"{engineer_name}, compacting context. Summary saved."
        else:
            # Simple format
            full_message = f"{engineer_name}, compacting context. {message}"
        
        # Use speak command
        subprocess.Popen(
            ["speak", full_message],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        logging.info(f"Sent to TTS: {full_message[:100]}...")
        
    except Exception as e:
        logging.error(f"Failed to send to TTS: {e}")

def notify_observability(summary_info):
    """Send summary event to observability system"""
    try:
        # Prepare event data
        event_data = {
            "hook_type": "PreCompact",
            "summary_generated": True,
            "technical_summary": summary_info.get('technical_file', ''),
            "executive_summary": summary_info.get('executive_file', ''),
            "brief_summary": summary_info.get('executive_brief', '')[:200] + "..." if len(summary_info.get('executive_brief', '')) > 200 else summary_info.get('executive_brief', ''),
            "timestamp": datetime.now().isoformat()
        }
        
        # Log the event
        logging.info(f"PreCompact event: {json.dumps(event_data, indent=2)}")
        
    except Exception as e:
        logging.error(f"Failed to notify observability: {e}")

def main():
    """Main hook execution"""
    logging.info("=== PreCompact Hook Started ===")
    
    # Find codex-summarize.sh
    codex_path = get_codex_summarize_path()
    if not codex_path:
        logging.error("Could not find codex-summarize.sh - skipping summarization")
        send_to_tts("Context compaction started, summary unavailable")
        return
    
    logging.info(f"Using codex-summarize.sh at: {codex_path}")
    
    # Export conversation
    conversation_file = export_conversation()
    if not conversation_file:
        logging.warning("No conversation to summarize")
        send_to_tts("Context compaction started, no conversation to summarize")
        return
    
    try:
        # Generate summaries
        summaries = generate_summaries(conversation_file, codex_path)
        
        # Send brief summary to TTS
        brief_summary = summaries.get('executive_brief', 'Context compaction completed')
        send_to_tts(brief_summary)
        
        # Notify observability system
        notify_observability(summaries)
        
        # Log summary locations
        if 'technical_file' in summaries:
            logging.info(f"Technical summary: {summaries['technical_file']}")
        if 'executive_file' in summaries:
            logging.info(f"Executive summary: {summaries['executive_file']}")
            
    finally:
        # Clean up temporary file
        if conversation_file and os.path.exists(conversation_file):
            try:
                os.unlink(conversation_file)
                logging.debug(f"Cleaned up temporary file: {conversation_file}")
            except:
                pass
    
    logging.info("=== PreCompact Hook Completed ===")

if __name__ == "__main__":
    main()