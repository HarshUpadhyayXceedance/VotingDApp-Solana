export {};

declare global {
  interface PhantomProvider {
    isPhantom: boolean;
    publicKey?: {
      toString(): string;
    };
    connect(): Promise<{ publicKey: any }>;
    disconnect(): Promise<void>;
    signTransaction(transaction: any): Promise<any>;
    signAllTransactions(transactions: any[]): Promise<any[]>;
  }

  interface Window {
    solana?: PhantomProvider;
  }
}
