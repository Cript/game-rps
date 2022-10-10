import { ethers } from "hardhat";

async function main() {
  const GameRPS = await ethers.getContractFactory("GameRPS");
  const gameRPS = await GameRPS.deploy();

  await gameRPS.deployed();

  console.log("Address:", gameRPS.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
