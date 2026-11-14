// Server-side proxy to Groq. The key is read from the environment and never sent to the browser.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are the science assistant inside MarsWalk, a simulator of Jezero crater built on NASA Perseverance mission data.
Rules:
- Base answers on the CONTEXT JSON first. You may add well-established Mars science, but say when a statement goes beyond the context.
- Label claims as confirmed observation, scientific interpretation, hypothesis, or unknown whenever that distinction matters.
- Never state or imply that life, fossils or biosignatures have been confirmed on Mars. Organic molecules and "potential biosignatures" are not evidence of life.
- If you do not know, or the context does not cover it, say so plainly. Do not invent sample names, sol numbers, coordinates, measurements or citations.
- Terrain questions: the context describes the terrain model and its limitations. You cannot certify any route or slope as safe for astronauts; say what the model shows and what it cannot show.
- Be concise: at most about 150 words, plain text, no markdown headings.`;

export async function POST(request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      { configured: false, message: 'AI assistance is not configured yet. Add GROQ_API_KEY to .env.local and restart the server. The rest of MarsWalk works without it.' },
      { status: 503 }
    );
  }
  let body;
  try { body = await request.json(); } catch (e) { return NextResponse.json({ message: 'Invalid request.' }, { status: 400 }); }
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 600) : '';
  if (!question) return NextResponse.json({ message: 'Ask a question first.' }, { status: 400 });
  const context = JSON.stringify(body.context || {}).slice(0, 9000);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `CONTEXT:\n${context}\n\nQUESTION: ${question}` },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Groq error', res.status, detail.slice(0, 300));
      return NextResponse.json({ message: `The AI service returned an error (${res.status}). Check the API key and model name.` }, { status: 502 });
    }
    const data = await res.json();
    const answer = data && data.choices && data.choices[0] && data.choices[0].message ? String(data.choices[0].message.content || '').trim() : '';
    if (!answer) return NextResponse.json({ message: 'The AI service returned an empty answer.' }, { status: 502 });
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ message: 'Could not reach the AI service. Check the network connection.' }, { status: 502 });
  }
}
