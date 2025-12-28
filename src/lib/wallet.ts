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

const SUPPORTED_CHAIN_IDS = Object.keys(CONTRACTS).map((id) => Number(id));

const DEFAULT_CHAIN_ID = (() => {
  const envValue = Number((import.meta as any)?.env?.VITE_DEFAULT_CHAIN_ID);
  if (!Number.isNaN(envValue) && SUPPORTED_CHAIN_IDS.includes(envValue)) {
    return envValue;
  }
  return SUPPORTED_CHAIN_IDS[0];
})();

export async function connectWallet(): Promise<WalletConnection> {
  const anyWin = window as any;
  if (!anyWin.ethereum) {
    throw new Error("No wallet detected");
  }

  let provider = new ethers.BrowserProvider(anyWin.ethereum);
  await provider.send("eth_requestAccounts", []);
  let signer = await provider.getSigner();
  const address = (await signer.getAddress()).toLowerCase();
  let network = await provider.getNetwork();
  let chainIdNum = Number(network.chainId);

  const ensureSupportedChain = async () => {
    const targetChainId = DEFAULT_CHAIN_ID;
    try {
      await anyWin.ethereum.request?.({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }]
      });
      provider = new ethers.BrowserProvider(anyWin.ethereum);
      await provider.send("eth_requestAccounts", []);
      signer = await provider.getSigner();
      network = await provider.getNetwork();
      chainIdNum = Number(network.chainId);
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        throw new Error(
          `Your wallet does not have ${CONTRACTS[targetChainId]?.name ?? "the required"} network configured. Please add it and try again.`
        );
      }
      throw new Error(
        `Unsupported chain connected. Please switch to ${CONTRACTS[targetChainId]?.name ?? "the supported"} network in your wallet.`
      );
    }
  };

  if (!SUPPORTED_CHAIN_IDS.includes(chainIdNum)) {
    await ensureSupportedChain();
  }

  if (!SUPPORTED_CHAIN_IDS.includes(chainIdNum)) {
    throw new Error("Unsupported chain connected. Please try again after switching networks.");
  }

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
