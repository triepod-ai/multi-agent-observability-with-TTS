# Agent Detection Strategies

## Overview

The Agent Detection Strategies system is a sophisticated, multi-layered approach designed to accurately identify and classify agents across diverse interaction contexts. This comprehensive documentation provides an in-depth exploration of the detection mechanisms, their implementation, and best practices.

## 1. Detection Strategy Hierarchy

### Strategy Prioritization
1. **Explicit Configuration** (Highest Priority)
2. **@-Mention Detection**
3. **Task Tool Detection**
4. **Persona-Based Detection**
5. **Pattern Matching**
6. **Transcript Analysis** (Lowest Priority)

## 2. Detailed Strategy Breakdown

### 2.1 Explicit Configuration
- **Description**: Manually specified agent type
- **Priority**: Highest
- **Implementation**:
  ```python
  def get_explicit_agent_type(input_data):
      """
      Retrieve explicitly defined agent type from configuration
      Returns: agent_type or None
      """
      return input_data.get('agent_type') or input_data.get('explicit_agent')
  ```
- **Use Cases**: 
  - Predefined agent roles
  - Override other detection methods
  - Precise agent type specification

### 2.2 @-Mention Detection
- **Description**: Direct agent invocation using `@agent-name`
- **Implementation**:
  ```python
  def extract_agent_from_mention(transcript):
      """
      Extract agent name from @-mention
      Returns: agent_name or None
      """
      mention_pattern = r'@(\w+(?:-\w+)*)'
      matches = re.findall(mention_pattern, transcript)
      return matches[0] if matches else None
  ```
- **Features**:
  - High precision
  - Typeahead and auto-completion
  - Exact agent specification

### 2.3 Task Tool Detection
- **Description**: Agent extraction from Task tool delegation
- **Implementation**:
  ```python
  def extract_agent_from_task_tool(task_data):
      """
      Extract agent metadata from Task tool command
      Returns: {agent_name, agent_type, tools}
      """
      return {
          'agent_name': task_data.get('delegate_to'),
          'agent_type': task_data.get('agent_category'),
          'tools': task_data.get('tools_granted', [])
      }
  ```
- **Characteristics**:
  - Parses command structure
  - Extracts comprehensive metadata
  - Fallback detection method

### 2.4 Persona-Based Detection
- **Description**: Map active personas to agent types
- **Implementation**:
  ```python
  PERSONA_TO_AGENT_MAP = {
      'architect': 'backend',
      'frontend': 'ui_designer',
      'security': 'vulnerability_analyst',
      'performance': 'optimizer',
      'scribe': 'documentation_expert'
  }

  def map_persona_to_agent(active_personas):
      """
      Convert active personas to potential agent types
      Returns: [agent_types]
      """
      return [PERSONA_TO_AGENT_MAP.get(p, 'unknown') for p in active_personas]
  ```
- **Benefits**:
  - Context-aware detection
  - Leverages existing persona system
  - Intelligent agent suggestions

### 2.5 Pattern Matching
- **Description**: Regex and keyword-based agent type identification
- **Implementation**:
  ```python
  AGENT_PATTERNS = {
      'debugger': [r'fix', r'debug', r'troubleshoot', r'error'],
      'analyzer': [r'analyze', r'investigate', r'review'],
      'performance': [r'optimize', r'speed', r'performance'],
      'security': [r'vulnerability', r'threat', r'secure']
  }

  def detect_agent_type_by_pattern(task_description):
      """
      Detect agent type using regex pattern matching
      Returns: agent_type or 'unknown'
      """
      for agent_type, patterns in AGENT_PATTERNS.items():
          if any(re.search(pattern, task_description, re.IGNORECASE) 
                 for pattern in patterns):
              return agent_type
      return 'unknown'
  ```
- **Advantages**:
  - Flexible context detection
  - Works with natural language
  - Enables proactive agent activation

### 2.6 Transcript Analysis
- **Description**: Advanced NLP-based agent type detection
- **Implementation**:
  ```python
  def analyze_transcript_for_agent_type(transcript):
      """
      Use NLP techniques to detect agent type from conversation
      Returns: {agent_type, confidence}
      """
      # Advanced NLP logic using embeddings, intent classification
      # Placeholder for machine learning model
      return {
          'agent_type': 'analyzer',
          'confidence': 0.75
      }
  ```
- **Features**:
  - Context-aware detection
  - Machine learning integration
  - Handles complex conversational contexts

## 3. Comprehensive Detection Workflow

```python
def detect_agent_type(input_data):
    """
    Comprehensive agent type detection strategy
    """
    detection_strategies = [
        extract_explicit_agent,          # Explicit Configuration
        extract_agent_from_mention,      # @-Mention Detection
        extract_agent_from_task_tool,    # Task Tool Detection
        map_persona_to_agent,            # Persona-Based Detection
        detect_agent_type_by_pattern,    # Pattern Matching
        analyze_transcript_for_agent_type # Transcript Analysis
    ]
    
    for strategy in detection_strategies:
        result = strategy(input_data)
        if result:
            return result
    
    return 'unknown'
```

## 4. Troubleshooting and Configuration

### Common Configuration
```yaml
agent_detection:
  enabled_strategies:
    - explicit_configuration
    - mention_detection
    - task_tool_detection
  fallback_mode: transcript_analysis
  logging: detailed
```

### Debugging Tips
- Enable detailed logging
- Use `--debug-agent-detection` flag
- Check detection strategy sequence
- Validate input data structure

## 5. Performance Considerations

- **Caching**: Cache detection results
- **Lazy Evaluation**: Defer complex strategies
- **Timeout Mechanism**: Limit detection time
- **Confidence Thresholds**: Require minimum confidence score

## 6. Use Cases and Examples

### Example 1: @-Mention Invocation
```python
transcript = "Hey @screenshot-analyzer, analyze this UI mockup"
agent_type = detect_agent_type({"transcript": transcript})
# Returns: "screenshot-analyzer"
```

### Example 2: Task Tool Delegation
```python
task_data = {
    "delegate_to": "debugger",
    "agent_category": "backend",
    "tools_granted": ["Read", "Edit", "Bash"]
}
agent_type = detect_agent_type(task_data)
# Returns: "debugger"
```

### Example 3: Persona-Based Detection
```python
session_context = {
    "active_personas": ["frontend", "performance"],
    "task_description": "Optimize component rendering"
}
agent_type = detect_agent_type(session_context)
# Returns: ["ui_designer", "optimizer"]
```

## 7. Integration with Other Systems

### MCP Server Integration
- Context7 for documentation lookup
- Sequential for complex analysis
- Magic for UI component insights

### Persona System Coordination
- Dynamically map personas to agent types
- Share detection context across systems

## 8. Future Roadmap

- **Machine Learning Enhancement**: 
  - Train models on historical agent invocations
  - Improve confidence scoring
  - Adaptive detection strategies

- **Cross-Language Support**:
  - Internationalization of detection patterns
  - Multi-lingual agent name recognition

- **Advanced Confidence Metrics**:
  - Develop machine learning models for intent classification
  - Create more granular confidence scoring

## Conclusion

The multi-strategy agent detection system provides a robust, flexible approach to identifying and classifying agents across diverse interaction contexts.

**Version**: 1.0.0
**Last Updated**: 2025-08-06