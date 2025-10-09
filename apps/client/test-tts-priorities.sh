#!/bin/bash

# Test script for TTS Priority Levels
# Demonstrates the notify_tts() function with different priority levels

# Enhanced TTS notification function using speak command
notify_tts() {
    local message="$1"
    local priority="${2:-normal}"  # Priority levels: normal, important, error, subagent_complete, memory_confirmed, memory_failed
    
    ENGINEER_NAME=${ENGINEER_NAME:-"Developer"}
    
    # Skip TTS if disabled
    if [ "${TTS_ENABLED:-true}" != "true" ]; then
        echo "TTS disabled - would have played: $message"
        return 0
    fi
    
    # Format message based on priority
    case "$priority" in
        "subagent_complete")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Sub-agent completed: $message"
            ;;
        "memory_confirmed")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Memory operation confirmed: $message"
            ;;
        "memory_failed")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Memory operation failed: $message"
            ;;
        "error")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Error: $message"
            ;;
        "important")
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, Important: $message"
            ;;
        *)
            PERSONALIZED_MESSAGE="$ENGINEER_NAME, $message"
            ;;
    esac
    
    echo "🔊 TTS [$priority]: $PERSONALIZED_MESSAGE"
    
    # Use speak command (non-blocking)
    if command -v speak &> /dev/null; then
        speak "$PERSONALIZED_MESSAGE" &
    else
        echo "⚠️  'speak' command not found - install from /home/bryan/speak-app/"
    fi
}

# Test script header
echo "=========================================="
echo "TTS Priority Level Test Script"
echo "=========================================="
echo ""

# Check if speak command is available
if ! command -v speak &> /dev/null; then
    echo "⚠️  WARNING: 'speak' command not found"
    echo "   Install from: /home/bryan/speak-app/"
    echo "   Tests will show messages but no audio"
    echo ""
fi

# Set engineer name for personalized messages
export ENGINEER_NAME="${ENGINEER_NAME:-$(whoami | tr '[:lower:]' '[:upper:]')}"
echo "👤 Engineer Name: $ENGINEER_NAME"
echo ""

# Test 1: Normal Priority (default)
echo "Test 1: Normal Priority"
echo "----------------------"
notify_tts "Analysis complete for multi-agent system"
sleep 2

# Test 2: Important Priority
echo ""
echo "Test 2: Important Priority"
echo "--------------------------"
notify_tts "Manual intervention required for deployment" "important"
sleep 2

# Test 3: Error Priority
echo ""
echo "Test 3: Error Priority"
echo "---------------------"
notify_tts "Connection failed to Redis server" "error"
sleep 2

# Test 4: Subagent Complete Priority
echo ""
echo "Test 4: Subagent Complete Priority"
echo "----------------------------------"
notify_tts "Code analysis finished in 3.2 seconds" "subagent_complete"
sleep 2

# Test 5: Memory Confirmed Priority
echo ""
echo "Test 5: Memory Confirmed Priority"
echo "--------------------------------"
notify_tts "Session data saved to Redis cache" "memory_confirmed"
sleep 2

# Test 6: Memory Failed Priority
echo ""
echo "Test 6: Memory Failed Priority"
echo "------------------------------"
notify_tts "Failed to write to Qdrant vector database" "memory_failed"
sleep 2

# Test 7: TTS Disabled Test
echo ""
echo "Test 7: TTS Disabled Test"
echo "------------------------"
echo "Temporarily disabling TTS..."
TTS_ENABLED=false notify_tts "This message should be silent" "normal"

# Test completion
echo ""
echo "=========================================="
echo "TTS Priority Test Complete"
echo "=========================================="
echo ""
echo "Usage Examples:"
echo "---------------"
echo "notify_tts \"Build successful\""
echo "notify_tts \"Critical system update\" \"important\""
echo "notify_tts \"Database connection failed\" \"error\""
echo "notify_tts \"AI analysis completed\" \"subagent_complete\""
echo ""
echo "Environment Variables:"
echo "- ENGINEER_NAME: Personalizes messages (current: $ENGINEER_NAME)"
echo "- TTS_ENABLED: Enable/disable TTS (current: ${TTS_ENABLED:-true})"
echo "- TTS_PROVIDER: Force specific provider (openai/elevenlabs/pyttsx3)"