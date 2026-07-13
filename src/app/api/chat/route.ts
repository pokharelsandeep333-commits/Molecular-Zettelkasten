import { NextResponse } from 'next/server';
import { streamText, generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { promises as fs } from 'fs';
import path from 'path';

const VAULT_PATH = process.env.VAULT_PATH || '';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; // Need base URL for internal fetch

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Function to fetch search results from our existing endpoint
async function getRelevantContext(query: string) {
  try {
    // 1. Query Expansion / HyDE: Convert a question into statements/keywords for better vector matching
    const { text: optimizedQuery } = await generateText({
      model: google('gemini-3.5-flash'),
      prompt: `You are an AI generating a search query for a semantic vector database.
The user's chat message is: "${query}"
Generate a hypothetical document snippet or a list of highly specific keywords that would contain the answer. 
For example, if they ask "what is my name?", you might output "My name is, user profile, memory, personal information".
Keep it under 20 words. Do NOT answer the question. Just output the search terms.`,
    });

    const searchQuery = optimizedQuery || query;

    // Call our semantic search API
    const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];

    // Extract the valid slugs
    const matchedSlugs = Array.from(new Set<string>(
      (data.results as { key: string }[])
        .map(r => {
          let k = r.key;
          k = k.replace(/^smart_\w+:/, '');
          k = k.split('#')[0];
          // We DO NOT strip ^Wiki/ anymore so we can handle Raw/ and other top-level folders
          k = k.replace(/\.md$/, '');
          return k.trim();
        })
        .filter(Boolean)
    ));

    // Read the actual file contents for context
    const contexts = [];
    for (const slug of matchedSlugs.slice(0, 5)) {
      try {
        const actualPath = path.join(VAULT_PATH, `${slug}.md`);
        const content = await fs.readFile(actualPath, 'utf-8');
        contexts.push(`--- Note: ${slug} ---\n${content}`);
      } catch {
        console.warn('Could not read file for context:', slug);
      }
    }
    
    return contexts;
  } catch (e) {
    console.error('Failed to get context', e);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();
    const lastMessage = messages[messages.length - 1];
    const aiModel = model || 'gemini-3.5-flash';

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set in environment variables.' },
        { status: 500 }
      );
    }

    // Retrieve context from the vault using semantic search
    const contexts = await getRelevantContext(lastMessage.content);
    const contextString = contexts.length > 0 
      ? `\n\nRELEVANT VAULT NOTES:\n${contexts.join('\n\n')}`
      : '\n\nNo relevant vault notes found for this query.';

    const systemPrompt = `You are O.R.I.O.N., a highly advanced, Stark-inspired AI assistant for The Arc Vault.
You are an expert at synthesizing information from the user's personal knowledge base (vault).
Your primary goal is to answer the user's questions using the RELEVANT VAULT NOTES provided below.

CRITICAL INSTRUCTIONS:
1. If the provided notes contain the answer, synthesize the information clearly and concisely.
2. CITATIONS: You MUST cite your sources when using information from the notes. Use the double-bracket syntax: [[Note Name]] (e.g., [[AI and ML Engineering Technical Skills]]). This will allow the user to click the link and open the note.
3. If the notes do not contain the answer, simply answer the question directly using your general knowledge. Do not add disclaimers or apologies about the vault.

${contextString}`;

    // Stream the response from Gemini
    const result = await streamText({
      model: google(aiModel),
      system: systemPrompt,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    
    // Handle Gemini API Quota Limits gracefully
    if (error?.message?.includes('Quota exceeded') || error?.message?.includes('429')) {
      let timeString = 'a few minutes';
      const retryMatch = error.message.match(/retry in ([\d.]+)s/);
      let isDaily = false;

      if (retryMatch) {
        const totalSeconds = Math.ceil(parseFloat(retryMatch[1]));
        if (totalSeconds >= 3600) isDaily = true; // Wait times > 1hr are definitely daily limits

        if (totalSeconds < 60) {
          timeString = `${totalSeconds} seconds`;
        } else if (totalSeconds < 3600) {
          const m = Math.floor(totalSeconds / 60);
          const s = totalSeconds % 60;
          timeString = s > 0 ? `${m} minute${m !== 1 ? 's' : ''} and ${s} second${s !== 1 ? 's' : ''}` : `${m} minute${m !== 1 ? 's' : ''}`;
        } else if (totalSeconds < 86400) {
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          timeString = m > 0 ? `${h} hour${h !== 1 ? 's' : ''} and ${m} minute${m !== 1 ? 's' : ''}` : `${h} hour${h !== 1 ? 's' : ''}`;
        } else {
          const d = Math.floor(totalSeconds / 86400);
          const h = Math.floor((totalSeconds % 86400) / 3600);
          timeString = h > 0 ? `${d} day${d !== 1 ? 's' : ''} and ${h} hour${h !== 1 ? 's' : ''}` : `${d} day${d !== 1 ? 's' : ''}`;
        }
      }

      // Try to extract the limit value to provide more context
      const limitMatch = error.message.match(/limit: (\d+)/);
      let limitContext = '';
      if (limitMatch) {
        const limitVal = parseInt(limitMatch[1], 10);
        if (limitVal >= 1000 || isDaily) {
          limitContext = `(Daily Limit: ${limitVal} requests).`;
        } else {
          limitContext = `(Short-term Limit: ${limitVal} requests).`;
        }
      } else {
        limitContext = isDaily ? `(Daily Limit Reached).` : `(Rate Limit Reached).`;
      }

      return new Response(`API Quota Exhausted ${limitContext} Please wait ${timeString} before trying again.`, { 
        status: 429 
      });
    }

    return new Response(error.message || 'Failed to process chat request', { status: 500 });
  }
}
