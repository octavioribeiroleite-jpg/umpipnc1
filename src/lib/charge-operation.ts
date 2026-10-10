export interface ChargeSnapshot {
  id: string;
  member_id: string;
  society_id: string | null;
  amount: number;
  paid_amount: number | null;
  status: string;
  transaction_id: string | null;
  updated_at: string;
}

export interface ChargeOperationRequest {
  p_request_id: string;
  p_charge_id: string;
  p_operation: 'payment' | 'revert' | 'delete';
  p_expected: Record<string, string | number | null>;
  p_payload: Record<string, string | number | null>;
}

export interface ChargeOperationResult {
  request_id: string;
  operation: ChargeOperationRequest['p_operation'];
  replayed: boolean;
  charge: (ChargeSnapshot & Record<string, unknown>) | null;
}

export function chargePaymentDateInput(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function createChargeOperation(
  charge: ChargeSnapshot,
  operation: ChargeOperationRequest['p_operation'],
  payload: ChargeOperationRequest['p_payload'] = {},
): ChargeOperationRequest {
  return {
    p_request_id: crypto.randomUUID(),
    p_charge_id: charge.id,
    p_operation: operation,
    p_expected: {
      amount: Number(charge.amount),
      paid_amount: Number(charge.paid_amount || 0),
      status: charge.status,
      member_id: charge.member_id,
      society_id: charge.society_id,
      transaction_id: charge.transaction_id,
      updated_at: charge.updated_at,
    },
    p_payload: { ...payload },
  };
}

/** A retry keeps the same immutable request. The server commits both records
 * together and remembers its key even after the charge is reverted or deleted. */
export async function executeChargeOperation(
  rpc: (request: ChargeOperationRequest) => PromiseLike<{ data: unknown; error: unknown }>,
  request: ChargeOperationRequest,
): Promise<ChargeOperationResult> {
  const { data, error } = await rpc(request);
  if (error) throw error;
  const result = data as ChargeOperationResult | null;
  const charge = result?.charge;
  const validCharge = charge === null || (!!charge
    && charge.id === request.p_charge_id && typeof charge.member_id === 'string'
    && (charge.society_id === null || typeof charge.society_id === 'string')
    && typeof charge.status === 'string' && typeof charge.updated_at === 'string'
    && typeof charge.amount === 'number' && Number.isFinite(charge.amount)
    && (charge.paid_amount === null || (typeof charge.paid_amount === 'number' && Number.isFinite(charge.paid_amount)))
    && (charge.transaction_id === null || typeof charge.transaction_id === 'string'));
  if (!result || result.request_id !== request.p_request_id
    || result.operation !== request.p_operation || typeof result.replayed !== 'boolean'
    || !validCharge
    || (!result.replayed && request.p_operation !== 'delete' && !result.charge)) {
    throw new Error('O banco não confirmou a operação. Tente novamente.');
  }
  return result;
}

export function chargeOperationError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && error.code === '40001') {
    return 'Esta cobrança mudou. Atualize os dados antes de tentar novamente.';
  }
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : 'Não foi possível confirmar a operação. Tente novamente.';
}
