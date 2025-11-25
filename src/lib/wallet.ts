// src/lib/wallet.ts
import { ethers } from "ethers";
import { CONTRACTS } from "./contracts";
import { writable } from "svelte/store";
import { supabase } from "./supabaseClient";

export const walletAddress = writable<string | null>(null);
export const chainId = writable<number | null>(null);
export const chainName = writable<string | null>(null);

export type WalletConnection = {
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  address: string;
  chainName: string;
  chainId: number;
  contracts?: {
    name: string;
    raffle: string;
    rewardVault: string;
  };
};

export async function connectWallet(): Promise<WalletConnection> {
  const anyWin = window as any;
  if (!anyWin.ethereum) {
    throw new Error("No wallet detected");
  }

  const provider = new ethers.BrowserProvider(anyWin.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = (await signer.getAddress()).toLowerCase();
  const network = await provider.getNetwork();

  const chainIdNum = Number(network.chainId); 
  const contracts = CONTRACTS[chainIdNum];

  if (!contracts) {
    throw new Error(`Unsupported chain ID: ${chainIdNum}`);
  }

  return {
    provider,
    signer,
    address,
    chainName: contracts.name,
    chainId: chainIdNum,
    contracts
  };
}

export function hydrateWalletFromSession(address: string | null) {
  walletAddress.set(address ?? null);
}

export async function signInWithWallet(wallet: WalletConnection): Promise<void> {
  const { address, chainId: connectedChainId, chainName: connectedChainName } = wallet;

  const auth = supabase.auth as any;
  const { error } = await auth.signInWithWeb3({
    chain: 'ethereum',
    wallet: (window as any).ethereum
  });

  if (error) {
    throw error;
  }

  const { data: sessionResult } = await supabase.auth.getSession();
  const session = sessionResult.session;

  if (session) {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in
      })
    });
  }

  walletAddress.set(address);
  chainId.set(connectedChainId);
  chainName.set(connectedChainName);
}

export async function signOutWallet(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn("Supabase sign out failed", error);
  }

  walletAddress.set(null);
  chainId.set(null);
  chainName.set(null);
}
