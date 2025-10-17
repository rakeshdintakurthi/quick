export interface AIResponse {
  suggestion: string;
  explanation: string;
  issue_detected?: string;
  docstring?: string;
  suggestion_type: 'completion' | 'optimization' | 'debug' | 'docstring';
}

export interface AIRequest {
  code: string;
  language: string;
  cursorPosition?: { line: number; column: number };
  contextCode?: string;
  requestType: 'completion' | 'optimization' | 'debug' | 'docstring';
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

class AIService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || OPENAI_API_KEY || '';
  }

  private getSystemPrompt(requestType: string, language: string): string {
    const basePrompt = `You are an expert ${language} developer and code assistant. Analyze code and provide helpful, actionable suggestions.`;

    const typeSpecificPrompts = {
      completion: `${basePrompt}
When completing code:
- Analyze the context and cursor position
- Suggest the most likely completion based on patterns
- Keep suggestions concise and idiomatic
- Follow ${language} best practices and conventions`,

      optimization: `${basePrompt}
When optimizing code:
- Identify inefficiencies (nested loops, redundant operations, poor algorithms)
- Suggest more efficient alternatives
- Explain performance improvements
- Maintain code readability
- Provide time/space complexity analysis when relevant`,

      debug: `${basePrompt}
When debugging code:
- Identify potential bugs, errors, and edge cases
- Explain why the issue occurs
- Suggest fixes with explanations
- Consider error handling and validation
- Point out common pitfalls in ${language}`,

      docstring: `${basePrompt}
When generating documentation:
- Follow ${language} documentation conventions (JSDoc for JS/TS, docstrings for Python, JavaDoc for Java)
- Include parameter descriptions with types
- Document return values
- Add usage examples for complex functions
- Note any side effects or exceptions`,
    };

    return typeSpecificPrompts[requestType as keyof typeof typeSpecificPrompts] || basePrompt;
  }

  private getUserPrompt(request: AIRequest): string {
    const { code, cursorPosition, contextCode, requestType } = request;

    let prompt = `Language: ${request.language}\n\n`;

    if (requestType === 'completion' && cursorPosition) {
      prompt += `Complete the code at line ${cursorPosition.line}, column ${cursorPosition.column}:\n\n`;
    } else if (requestType === 'optimization') {
      prompt += 'Analyze this code and suggest optimizations:\n\n';
    } else if (requestType === 'debug') {
      prompt += 'Review this code for bugs, errors, and potential issues:\n\n';
    } else if (requestType === 'docstring') {
      prompt += 'Generate comprehensive documentation for this code:\n\n';
    }

    prompt += '```' + request.language + '\n' + code + '\n```\n\n';

    if (contextCode) {
      prompt += `Additional context:\n\`\`\`${request.language}\n${contextCode}\n\`\`\`\n\n`;
    }

    prompt += `Respond with a JSON object containing:
{
  "suggestion": "your suggested code or completion",
  "explanation": "clear explanation of your suggestion",
  "issue_detected": "description of issues found (optional, mainly for debug/optimization)",
  "docstring": "generated documentation (for docstring requests only)"
}

Important:
- Keep suggestions practical and ready to use
- Preserve code style and formatting conventions
- For completions, provide only the next logical code segment
- For optimizations, provide the improved version
- For debugging, provide the fixed version
- For docstrings, provide properly formatted documentation`;

    return prompt;
  }

  async getSuggestion(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    if (!this.apiKey) {
      return this.getMockResponse(request);
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(request.requestType, request.language),
            },
            {
              role: 'user',
              content: this.getUserPrompt(request),
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          suggestion_type: request.requestType,
        };
      }

      return {
        suggestion: content,
        explanation: 'AI generated suggestion',
        suggestion_type: request.requestType,
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.getMockResponse(request);
    } finally {
      console.log(`AI Request took ${Date.now() - startTime}ms`);
    }
  }

  private getMockResponse(request: AIRequest): AIResponse {
    const mockResponses = {
      completion: {
        suggestion: '  return result;',
        explanation: 'Complete the function with a return statement',
        suggestion_type: 'completion' as const,
      },
      optimization: {
        suggestion: `// Optimized version using ${request.language === 'python' ? 'list comprehension' : 'map/filter'}
const result = items.filter(x => x.active).map(x => x.value);`,
        explanation: 'Replaced nested loops with functional approach for better readability and performance',
        issue_detected: 'Nested loops can be simplified',
        suggestion_type: 'optimization' as const,
      },
      debug: {
        suggestion: `if (!array || array.length === 0) {
  return null;
}`,
        explanation: 'Added null and empty array checks to prevent runtime errors',
        issue_detected: 'Missing validation for edge cases',
        suggestion_type: 'debug' as const,
      },
      docstring: {
        suggestion: request.code,
        explanation: 'Generated comprehensive documentation',
        docstring: `/**
 * Processes user data and returns formatted result
 * @param {Object} userData - The user data object
 * @param {string} userData.name - User's name
 * @param {number} userData.age - User's age
 * @returns {string} Formatted user information
 * @throws {Error} If userData is invalid
 */`,
        suggestion_type: 'docstring' as const,
      },
    };

    return mockResponses[request.requestType] || mockResponses.completion;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}

export const aiService = new AIService();
