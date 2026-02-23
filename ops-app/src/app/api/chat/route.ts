import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: openai('gpt-4o'),
        messages,
        system: `You are a helpful assistant for a School Uniform Operations Manager.
    You have access to a Supabase database.
    Use the queryDatabase tool to answer questions about orders, products, schools, and embroidery jobs.
    
    When answering:
    - If the user asks for a count, run a count query.
    - If the user asks for a list, limit the results to 10 unless specified otherwise.
    - If the query returns no results, say so clearly.
    - Format tables or lists nicely in markdown.
    `,
        tools: {
            queryDatabase: tool({
                description: 'Execute a read-only SQL query on the Supabase database to answer user questions.',
                inputSchema: z.object({
                    query: z.string().describe('The SQL query to execute. MUST be a SELECT statement. No INSERT, UPDATE, DELETE allowed.'),
                    explanation: z.string().describe('Explanation of what the query does.')
                }),
                execute: async ({ query, explanation }: { query: string; explanation: string }): Promise<string> => {
                    console.log(`Executing SQL: ${query} (${explanation})`);

                    // Basic safety check for read-only
                    if (!query) return JSON.stringify({ error: 'Query is empty' });

                    const lowerQuery = query.toLowerCase();
                    if (lowerQuery.includes('insert') || lowerQuery.includes('update') || lowerQuery.includes('delete') || lowerQuery.includes('drop') || lowerQuery.includes('alter') || lowerQuery.includes('truncate')) {
                        return JSON.stringify({ error: 'Only SELECT queries are allowed for safety.' });
                    }

                    if (!supabase) {
                        return JSON.stringify({ error: 'Supabase client not initialized' });
                    }

                    const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });

                    if (error) {
                        console.error('Supabase Error:', error);
                        return JSON.stringify({
                            error: `Database error: ${error.message}.`,
                            hint: "Note: To allow arbitrary SQL execution, you must create a Postgres function named 'execute_sql' in Supabase. Otherwise, this tool will fail."
                        });
                    }

                    return JSON.stringify(data, null, 2);
                },
            }),
        },
    });

    return result.toTextStreamResponse();
}
