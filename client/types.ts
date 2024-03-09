// types.ts

// Define TypeScript representation for Rust's Pubkey
type Pubkey = string;


// Define TypeScript representation for Rust's ContractState struct
export interface ContractState {
    queued_functions: QueuedFunction[];
    delegate: Pubkey | null;
}

// Define TypeScript representation for Rust's QueuedFunction struct
export interface QueuedFunction {
    function: CriticalFunction;
    execution_time: bigint;
    cancelled: boolean;
    initiator: Pubkey;
    delegate: Pubkey | null;
}

// Define TypeScript representation for Rust's Instruction enum
export type Instruction =
    | { type: 'QueueCriticalFunction', function: CriticalFunction, delay_in_seconds: bigint }
    | { type: 'CancelFunction', function_index: number }
    | { type: 'CheckExecution' }
    | { type: 'SetDelegate', delegate_pubkey: Pubkey };

