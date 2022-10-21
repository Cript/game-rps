import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BytesLike } from "ethers";
import { ethers } from "hardhat";
import { GameRPS } from "../typechain-types";


export async function deployGame() {
    const GameRPS = await ethers.getContractFactory("GameRPS")
    const gameRPS = await GameRPS.deploy()

    return { gameRPS }
}

export function createCommitment(address: string, choice: number, blindingFactor: Uint8Array) {
    return ethers.utils.solidityKeccak256(["address", "uint8", "bytes32"], [address, choice, blindingFactor])
}

export async function createGame(gameRPS: GameRPS, creator: SignerWithAddress, commitment: BytesLike): Promise<string> {
    const tx = await gameRPS.connect(creator).createGame(commitment)
    const txReceipt = await tx.wait();        
    const event = txReceipt.events?.find(event => event.event === 'Create');
    const gameId = event?.args?.gameId;

    return gameId;
}

export async function join(gameRPS: GameRPS, gameId: string, address: SignerWithAddress, choice: number, blindingFactor: Uint8Array) {
    const commitment = createCommitment(address.address, choice, blindingFactor)

    await gameRPS.connect(address).join(gameId, commitment)
}