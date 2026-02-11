import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZodTypeAny } from 'zod';
import type { Database } from '@/lib/supabase/database.types';

export class RpcContractError extends Error {
  constructor(message: string, public readonly rpcName: string) {
    super(message);
    this.name = 'RpcContractError';
  }
}

export async function rpcCall<TSchema extends ZodTypeAny>(params: {
  client: SupabaseClient<Database>;
  rpcName: string;
  args?: Record<string, unknown>;
  schema: TSchema;
}): Promise<ReturnType<TSchema['parse']>> {
  const { client, rpcName, args, schema } = params;
  const { data, error } = await client.rpc(rpcName as never, args as never);
  if (error) {
    throw new RpcContractError(error.message, rpcName);
  }

  try {
    return schema.parse(data);
  } catch (error) {
    throw new RpcContractError(`Schema mismatch for ${rpcName}: ${String(error)}`, rpcName);
  }
}

export async function rpcCallMaybeArray<TSchema extends ZodTypeAny>(params: {
  client: SupabaseClient<Database>;
  rpcName: string;
  args?: Record<string, unknown>;
  schema: TSchema;
}): Promise<ReturnType<TSchema['parse']>> {
  const data = await rpcCall(params);
  if (Array.isArray(data)) {
    return params.schema.parse(data[0] ?? null) as ReturnType<TSchema['parse']>;
  }
  return data;
}

