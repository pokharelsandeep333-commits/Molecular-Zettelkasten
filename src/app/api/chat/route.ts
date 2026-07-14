import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { promises as fs } from 'fs';
import path from 'path';

const VAULT_PATH = process.env.VAULT_PATH || '';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function getRelevantContext(query: string) {
  try {
    // 1. Query Expansion / HyDE using stateless interaction
    const hydeRes = await client.interactions.create({
      model: 'gemini-3.5-flash',
      input: `You are an AI generating a search query for a semantic vector database.
The user's chat message is: "${query}"
Generate a hypothetical document snippet or a list of highly specific keywords that would contain the answer. 
For example, if they ask "what is my name?", you might output "My name is, user profile, memory, personal information".
Keep it under 20 words. Do NOT answer the question. Just output the search terms.`,
      store: false,
    });

    const optimizedQuery = hydeRes.output_text || query;
    const searchQuery = optimizedQuery;

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
    const { input, previous_interaction_id, model } = await req.json();
    const aiModel = model || 'gemini-3.5-flash';

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not set in environment variables.' },
        { status: 500 }
      );
    }

    if (!input) {
      return NextResponse.json(
        { error: 'Input is required.' },
        { status: 400 }
      );
    }

    // Retrieve context from the vault using semantic search
    const contexts = await getRelevantContext(input);
    const contextString = contexts.length > 0 
      ? `\n\nRELEVANT VAULT NOTES:\n${contexts.join('\n\n')}`
      : '\n\nNo relevant vault notes found for this query.';

    const systemInstruction = `You are E.D.I.T.H., a highly advanced, Stark-inspired AI assistant for the Neural Matrix.
Your purpose is to help the user (Sandeep) navigate, understand, and synthesize their personal knowledge base.
You have a crisp, highly technical, slightly formal, and efficient personality.
You are currently providing a contextual answer based on the following relevant notes retrieved from the Neural Matrix:

CRITICAL INSTRUCTIONS:
1. If the provided notes contain the answer, synthesize the information clearly and concisely.
2. CITATIONS: You MUST cite your sources when using information from the notes. Use the double-bracket syntax: [[Note Name]] (e.g., [[AI and ML Engineering Technical Skills]]). This will allow the user to click the link and open the note.
3. If the notes do not contain the answer, simply answer the question directly using your general knowledge. Do not add disclaimers or apologies about the vault.

${contextString}`;

    const interaction = await client.interactions.create({
      model: aiModel,
      input,
      system_instruction: systemInstruction,
      ...(previous_interaction_id ? { previous_interaction_id } : {})
    });

    return NextResponse.json({
      text: interaction.output_text,
      interactionId: interaction.id,
    });
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    const err = error as Error;
    
    // Handle Gemini API Quota Limits gracefully
    if (err?.message?.includes('Quota exceeded') || err?.message?.includes('429')) {
      return NextResponse.json(
        { error: 'API Quota Exhausted. Please wait before trying again.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
