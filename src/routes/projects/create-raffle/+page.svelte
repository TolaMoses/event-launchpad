<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { chainId } from "$lib/wallet";
  import { TOKEN_LIST } from "$lib/tokens";
  import { ethers } from "ethers";
  import { CONTRACTS, ABIS } from "$lib/contracts";

  let prizeType = "";
  let prizeAddress = "";
  let maxTickets = "";
  let selectedDate: string = "";
  let selectedTime: string = "";
  let endTime: string | null = null;
  let numWinners = "";
  let prizePool = "";
  let nfts: { contract: string; tokenId: string }[] = [];
  let availableTokens: { symbol: string; address: string; decimals: number }[] = [];
  let errorMsg = "";
  let validationErrors: string[] = [];

  $: availableTokens = $chainId ? TOKEN_LIST[$chainId] || [] : [];

  $: console.log("chainId is", $chainId, "tokens:", $chainId ? TOKEN_LIST[$chainId] || [] : "Wallet not connected");

  function addNftField() {
    nfts = [...nfts, { contract: "", tokenId: "" }];
  }

  function removeNftField(index: number) {
    nfts = nfts.filter((_, i) => i !== index);
  }

  $: if (prizeType === "NFT" && nfts.length === 0) {
    addNftField();
  }

  // Remove automatic form validation - we'll validate on submit instead
  let submitAttempted = false;
  
  // Console logging for current form values
  $: console.log('Current form values:', {
    prizeType,
    prizeAddress, 
    prizePool,
    maxTickets,
    numWinners,
    selectedDate,
    selectedTime,
    endTime,
    errorMsg,
    submitAttempted
  });

  function updateEndTime() {
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const combined = new Date(selectedDate);
      combined.setHours(hours, minutes, 0, 0);

      if (combined <= new Date()) {
        errorMsg = "End time must be in the future";
        endTime = null;
      } else {
        errorMsg = "";
        endTime = combined.toISOString();
      }
    }
  }

  function isFormValid() {
    const errors: string[] = [];

    // Common validations
    if (!prizeType) errors.push("Select a prize type");
    if (!numWinners || Number(numWinners) < 1 || !Number.isInteger(Number(numWinners))) {
      errors.push("Number of winners must be a positive integer");
    }
    if (!endTime) errors.push("Pick a valid future end date and time");
    if (errorMsg) errors.push(errorMsg);

    // NFT validations
    if (prizeType === "NFT") {
      if (nfts.length === 0) errors.push("Add at least one NFT");
      if (nfts.length && Number(numWinners) > 0 && nfts.length % Number(numWinners) !== 0) {
        errors.push("Number of NFTs must be divisible by number of winners");
      }
      if (nfts.some((n) => !n.contract || !n.tokenId)) {
        errors.push("Each NFT must have contract and token ID");
      }
    }

    // Token validations with precise divisibility (use token decimals)
    if (prizeType === "Token") {
      if (!prizeAddress) errors.push("Select a prize token");
      if (!prizePool || Number(prizePool) <= 0) {
        errors.push("Enter a positive prize pool");
      } else {
        const token = availableTokens.find((t) => t.address === prizeAddress);
        if (token) {
          try {
            const amountWei = ethers.parseUnits(String(prizePool), token.decimals);
            const winners = BigInt(Number(numWinners || 0));
            if (winners > 0n && amountWei % winners !== 0n) {
              errors.push(
                `Prize pool must be divisible by number of winners in ${token.symbol} smallest units (decimals ${token.decimals})`
              );
            }
          } catch (e) {
            errors.push("Invalid prize pool format for selected token");
          }
        }
      }
    }

    validationErrors = errors;
    return errors.length === 0;
  }



 async function createRaffle() {
  submitAttempted = true;
  
  if (!window.ethereum) return alert("No wallet found");

  // Validate form on submit
  if (!isFormValid()) {
    // Validation errors will be shown in the UI
    return;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const addr = await signer.getAddress();

  const { chainId: networkChainId } = await provider.getNetwork();
  const contracts = CONTRACTS[Number(networkChainId)];

  if (!contracts) {
    return alert(`Unsupported chain ${chainId.toString()}`);
  }

  // ✅ Pre-check for NFT ownership + detect type
  let nftTypes: { [key: string]: "ERC721" | "ERC1155" } = {};

  if (prizeType === "NFT") {
    for (const nft of nfts) {
      const nftContract = new ethers.Contract(
        nft.contract,
        [
          // ERC-165 interface detection
          "function supportsInterface(bytes4 interfaceId) view returns (bool)",

          // ERC-721
          "function ownerOf(uint256 tokenId) view returns (address)",

          // ERC-1155
          "function balanceOf(address account, uint256 id) view returns (uint256)",
        ],
        provider
      );

      let isERC721 = false;
      let isERC1155 = false;

      try {
        isERC721 = await nftContract.supportsInterface("0x80ac58cd"); // ERC-721
      } catch {}
      try {
        isERC1155 = await nftContract.supportsInterface("0xd9b67a26"); // ERC-1155
      } catch {}

      if (isERC721) {
        try {
          const owner = await nftContract.ownerOf(nft.tokenId);
          if (owner.toLowerCase() !== addr.toLowerCase()) {
            return alert(
              `You don’t own ERC-721 NFT ${nft.tokenId} from ${nft.contract}`
            );
          }
          nftTypes[nft.contract + nft.tokenId] = "ERC721";
        } catch (err) {
          console.error("ERC721 ownership check failed:", err);
          return alert(
            `Could not verify ownership for ERC-721 token ${nft.tokenId}`
          );
        }
      } else if (isERC1155) {
        try {
          const balance = await nftContract.balanceOf(addr, nft.tokenId);
          if (balance <= 0n) {
            return alert(
              `You don’t own ERC-1155 NFT ${nft.tokenId} from ${nft.contract}`
            );
          }
          nftTypes[nft.contract + nft.tokenId] = "ERC1155";
        } catch (err) {
          console.error("ERC1155 ownership check failed:", err);
          return alert(
            `Could not verify ownership for ERC-1155 token ${nft.tokenId}`
          );
        }
      } else {
        return alert(`Contract ${nft.contract} is neither ERC-721 nor ERC-1155`);
      }
    }
  }

  const raffleContract = new ethers.Contract(
    contracts.raffle,
    ABIS.raffle,
    signer
  );

  // 1. Call smart contract to create raffle
  const tx = await raffleContract.createRaffle(
    Math.floor(new Date(endTime).getTime() / 1000),
    Number(numWinners),
    prizeType === "NFT" ? 2 : prizeType === "Token" ? 1 : 0 // assuming enum { Token=0, ETH=1, NFT=2 }
  );

  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => {
      try {
        return raffleContract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e?.name === "RaffleCreated");

  const raffleId = event?.args?.raffleId.toString();

  // 2. Save raffle in database
  const { error: raffleErr } = await supabase.from("raffles").insert({
    id: raffleId,
    host_wallet: addr,
    prize_type: prizeType,
    prize_pool: prizePool,
    prize_address: prizeAddress,
    max_tickets: maxTickets ? Number(maxTickets) : null,
    number_of_winners: numWinners,
    end_time: endTime,
  });
  if (raffleErr) console.error(raffleErr);

  // 3. Handle NFT prize transfers
  if (prizeType === "NFT") {
    for (const nft of nfts) {
      const nftType = nftTypes[nft.contract + nft.tokenId];

      // ✅ Save NFT with type in Supabase
      await supabase.from("raffle_nfts").insert({
        raffle_id: raffleId,
        nft_contract: nft.contract,
        token_id: nft.tokenId,
        nft_type: nftType,
      });

      // ✅ Transfer NFT
      const nftContract = new ethers.Contract(
        nft.contract,
        nftType === "ERC721"
          ? [
              "function safeTransferFrom(address from, address to, uint256 tokenId) external",
            ]
          : [
              "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external",
            ],
        signer
      );

      if (nftType === "ERC721") {
        const transferTx = await nftContract.safeTransferFrom(
          addr, 
          contracts.rewardVault, 
          nft.tokenId
        );
        await transferTx.wait();
      } else if (nftType === "ERC1155") {
        const transferTx = await nftContract.safeTransferFrom(
          addr,
          contracts.rewardVault,
          nft.tokenId,
          1, // transfer 1 unit
          "0x"
        );
        await transferTx.wait();
      }
    }
  }

  // 4. Handle ERC20 approval for contract to pull funds
  if (prizeType === "Token") {
    const erc20 = new ethers.Contract(
      prizeAddress,
      [
        "function approve(address spender, uint256 amount) public returns (bool)",
      ],
      signer
    );
    await erc20.approve(contracts.rewardVault, ethers.MaxUint256);
  }

  alert("Raffle created!");
}


</script>

<section class="form-section">
  <form
    class="raffle-form"
    on:submit={(e) => {
      e.preventDefault();
      createRaffle();
    }}
  >
    <div class="form-group">
      <label for="prize-type">Prize Type</label>
      <select
        id="prize-type"
        name="prize-type"
        bind:value={prizeType}
        on:change={() => {
          errorMsg = "";
          if (prizeType === "NFT" && nfts.length === 0) {
            addNftField();
          }
        }}
      >
        <option disabled hidden value="">Prize Type</option>
        <option value="Token">Token</option>
        <option value="NFT">NFT</option>
      </select>
    </div>

    {#if prizeType === "Token"}
      <div class="form-group">
        <label for="prize-token">Prize Token</label>
        <select
          id="prize-token"
          name="prize-token"
          bind:value={prizeAddress}
          required
          on:change={() => {
            errorMsg = "";
          }}
        >
          <option disabled hidden value="">Select Token</option>
          {#each availableTokens as token}
            <option value={token.address}>
              {token.symbol} ({token.decimals} decimals)
            </option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="prize-pool">Prize Pool (Tokens)</label>
        <input
          id="prize-pool"
          type="number"
          min="0"
          step="any"
          bind:value={prizePool}
          required
          on:input={(e) => {
            errorMsg = "";
            prizePool = (e.currentTarget as HTMLInputElement).value;
          }}
        />
      </div>
    {/if}

    {#if prizeType === "NFT"}
      <div class="form-group">
        <div class="group-header">
          <h3>NFTs</h3>
          <button type="button" class="secondary-btn" on:click={addNftField}>
            + Add NFT
          </button>
        </div>
        {#each nfts as nft, i}
          <div class="nft-row">
            <input
              class="nft-input"
              type="text"
              placeholder="NFT Contract"
              bind:value={nft.contract}
              required
              on:input={() => {
                errorMsg = "";
              }}
            />
            <input
              class="nft-input"
              type="text"
              placeholder="Token ID"
              bind:value={nft.tokenId}
              required
              on:input={() => {
                errorMsg = "";
              }}
            />
            <button
              type="button"
              class="remove-btn"
              on:click={() => removeNftField(i)}
            >
              ✕ Remove
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <div class="form-group">
      <label for="max-tickets">Max Tickets</label>
      <input
        id="max-tickets"
        type="number"
        min="0"
        placeholder="Optional"
        bind:value={maxTickets}
        on:input={(e) => {
          errorMsg = "";
          maxTickets = (e.currentTarget as HTMLInputElement).value;
        }}
      />
    </div>

    <div class="form-group">
      <label for="num-winners">Num of Winners</label>
      <input
        id="num-winners"
        type="number"
        min="1"
        placeholder="1"
        bind:value={numWinners}
        required
        on:input={(e) => {
          errorMsg = "";
          numWinners = (e.currentTarget as HTMLInputElement).value;
        }}
      />
    </div>

    <div class="form-group date-time-group">
      <div class="input-inline">
        <label for="end-date">Ends (date)</label>
        <input
          id="end-date"
          type="date"
          bind:value={selectedDate}
          required
          on:change={(e) => {
            selectedDate = (e.currentTarget as HTMLInputElement).value;
            updateEndTime();
          }}
        />
      </div>
      <div class="input-inline">
        <label for="end-time">Ends (time)</label>
        <input
          id="end-time"
          type="time"
          bind:value={selectedTime}
          required
          on:input={(e) => {
            selectedTime = (e.currentTarget as HTMLInputElement).value;
            updateEndTime();
          }}
        />
      </div>
    </div>

    <button type="submit" class="primary-btn">
      Create Raffle
    </button>
    {#if submitAttempted && validationErrors.length}
      <div class="validation-errors" style="margin-top: 0.75rem;">
        <ul style="margin: 0; padding-left: 1.25rem;">
          {#each validationErrors as err}
            <li style="color: #da1e28;">{err}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </form>
  {#if errorMsg}
    <p style="color:red">{errorMsg}</p>
  {/if}
</section>

<style>
  .form-section {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    background: #111118;
    border-radius: 16px;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .raffle-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    color: #f6f6fb;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .form-group label {
    font-weight: 600;
    font-size: 0.95rem;
  }

  select,
  input[type="text"],
  input[type="number"],
  input[type="date"],
  input[type="time"] {
    background: rgba(30, 33, 54, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    color: #f6f6fb;
    font-size: 0.95rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  select:focus,
  input:focus {
    outline: none;
    border-color: #d02670;
    box-shadow: 0 0 0 3px rgba(208, 38, 112, 0.25);
  }

  .date-time-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .input-inline {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .nft-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) auto;
    gap: 0.75rem;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .nft-input {
    width: 100%;
  }

  .primary-btn,
  .secondary-btn,
  .remove-btn {
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }

  .primary-btn {
    align-self: flex-start;
    padding: 0.85rem 1.75rem;
    background: linear-gradient(135deg, #d02670, #ee5396);
    color: #fff;
  }

  .primary-btn:hover {
    transform: translateY(-1px);
    opacity: 0.95;
  }

  .secondary-btn {
    padding: 0.6rem 1rem;
    background: transparent;
    color: #f6f6fb;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .secondary-btn:hover {
    opacity: 0.85;
  }

  .remove-btn {
    padding: 0.6rem 0.9rem;
    background: rgba(218, 30, 40, 0.12);
    color: #ff8080;
  }

  .remove-btn:hover {
    opacity: 0.9;
  }

  @media (max-width: 540px) {
    .form-section {
      padding: 1.5rem 1.25rem;
    }

    .nft-row {
      grid-template-columns: 1fr;
    }

    .group-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>