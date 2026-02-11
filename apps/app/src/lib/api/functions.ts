import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZodTypeAny } from 'zod';
import type { Database } from '@/lib/supabase/database.types';

export class EdgeContractError extends Error {
  constructor(message: string, public readonly functionName: string, public readonly code?: string) {
    super(message);
    this.name = 'EdgeContractError';
  }
}

export async function invokeEdge<TSchema extends ZodTypeAny>(params: {
  client: SupabaseClient<Database>;
  functionName: string;
  body?: Record<string, unknown>;
  schema: TSchema;
}): Promise<ReturnType<TSchema['parse']>> {
  const { client, functionName, body, schema } = params;
  const { data, error } = await client.functions.invoke(functionName, body ? { body } : undefined);

  if (error) {
    throw new EdgeContractError(error.message, functionName);
  }

  try {
    return schema.parse(data);
  } catch (schemaError) {
    throw new EdgeContractError(`Schema mismatch for ${functionName}: ${String(schemaError)}`, functionName);
  }
}

