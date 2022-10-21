import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { GameRPS } from "../typechain-types";


export async function deployGame() {
    const GameRPS = await ethers.getContractFactory("GameRPS")
    const gameRPS = await GameRPS.deploy()

    return { gameRPS }
}

export async function createGame(gameRPS: GameRPS, creator: SignerWithAddress, addresses: string[]): Promise<string> {
    const tx = await gameRPS.connect(creator).createGame(addresses)
    const txReceipt = await tx.wait();        
    const event = txReceipt.events?.find(event => event.event === 'Create');
    const gameId = event?.args?.gameId;

    return gameId;
}

export async function commit(gameRPS: GameRPS, gameId: string, address: SignerWithAddress, choice: number, blindingFactor: Uint8Array) {
    const commitment = ethers.utils.solidityKeccak256(["address", "uint8", "bytes32"], [address.address, choice, blindingFactor])

    await gameRPS.connect(address).commit(gameId, commitment)
}

export async function commitAll(gameRPS: GameRPS, gameId: string, addresses: SignerWithAddress[]) {
    for (const address of addresses) {
        await gameRPS.connect(address).commit(gameId, ethers.utils.randomBytes(32))
    }
}