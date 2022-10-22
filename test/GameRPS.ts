import { expect } from "chai"
import { ethers } from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs"
import { deployGame, createGame, join, createCommitment } from "./helpers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

describe("GameRPS", () => {
  let creator: SignerWithAddress
  let address1: SignerWithAddress
  let address2: SignerWithAddress
  let address3: SignerWithAddress

  const addresses: string[] = []

  before(async () => {    
    [creator, address1, address2, address3] = await ethers.getSigners()
    addresses.push(address1.address)
    addresses.push(address2.address)
    addresses.push(address3.address)
  })

  describe("CreateGame", () => {
    describe("Success", () => {
      it("Should emit Create event", async () => {
        const { gameRPS } = await loadFixture(deployGame)

        const creatorCommitment = ethers.utils.randomBytes(32)
  
        await expect(gameRPS.connect(creator).createGame(creatorCommitment))
          .to.emit(gameRPS, "Create")
          .withArgs(anyValue, creator.address)
      })
    })
  })
  
  describe("Join", () => {
    describe("Success", () => {
      it("Should emit Commit event", async () => {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, ethers.utils.randomBytes(32))
  
        await expect(gameRPS.connect(address2).join(gameId, ethers.utils.randomBytes(32)))
          .to.emit(gameRPS, "Join")
          .withArgs(gameId, address2.address)
      })
    })

    describe("Error", () => {
      it("Should revert if game is not exists", async () => {
        const { gameRPS } = await loadFixture(deployGame)

        await expect(
          gameRPS.join(ethers.utils.randomBytes(32), ethers.utils.randomBytes(32))
        ).revertedWith("Game does not exist")
      })

      it("Should revert if user already joined", async () => {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, ethers.utils.randomBytes(32))

        await expect(
          gameRPS.connect(creator).join(gameId, ethers.utils.randomBytes(32))
        ).revertedWith("Already joined")
      })

      it("Should revert if max players exceeded", async () => {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, ethers.utils.randomBytes(32))

        await gameRPS.connect(address1).join(gameId, ethers.utils.randomBytes(32))

        await expect(
          gameRPS.connect(address2).join(gameId, ethers.utils.randomBytes(32))
        ).revertedWith("Maximum players exceeded")
      })
    })
  })
  
  describe("Reveal", () => {
    describe("Success", () => {
      it("Should emit Reveal event", async () => {
        const { gameRPS } = await loadFixture(deployGame)

        const choice = 1
        const blindingFactor = ethers.utils.randomBytes(32)
        const commitmentCreator = createCommitment(creator.address, choice, blindingFactor)

        const gameId = await createGame(gameRPS, creator, commitmentCreator)

        const commitmentPlayer = createCommitment(address1.address, 1, ethers.utils.randomBytes(32))
        await join(gameRPS, gameId, address1, commitmentPlayer)
        
        await expect(gameRPS.connect(creator).reveal(gameId, choice, blindingFactor))
          .emit(gameRPS, "Reveal")
          .withArgs(gameId, creator.address, choice)
      })
    })

    describe("Error", () => {
      it("Should revert if game is not exists", async () => {
        const { gameRPS } = await loadFixture(deployGame)

        await expect(gameRPS.connect(address1).reveal(
          ethers.utils.randomBytes(32), 
          1, 
          ethers.utils.randomBytes(32)
        )).revertedWith("Game does not exist")
      })
      
      it("Should revert if not all commitments were added", async () => {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, ethers.utils.randomBytes(32));        
        
        await expect(
          gameRPS.connect(creator).reveal(gameId, 1, ethers.utils.randomBytes(32))
        ).revertedWith("Didn't receive all commitments")
      })
      
      it("Should revert if the hash is invalid", async () => {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, ethers.utils.randomBytes(32))

        const commitment = createCommitment(address1.address, 1, ethers.utils.randomBytes(32))
        await join(gameRPS, gameId, address1, commitment)

        await expect(
          gameRPS.connect(address1).reveal(gameId, 1, ethers.utils.randomBytes(32))
        ).revertedWith("Invalid hash")
      })
    })
  })

  describe("Game", () => {
    describe("Success", () => {
      it("should return new game", async () => {
        const { gameRPS } = await loadFixture(deployGame)

        const commitment = createCommitment(creator.address, 1, ethers.utils.randomBytes(32))
        const gameId = await createGame(gameRPS, creator, commitment)

        const game = await gameRPS.game(gameId)
        
        expect(game[0]).length(1)
        expect(game[0][0]).equals(creator.address)

        expect(game[1]).length(1)
        expect(game[1][0]).equals(commitment)

        expect(game[2]).eqls(Array(1).fill(0))
      })

      it("should return commitments", async () => {
        const { gameRPS } = await loadFixture(deployGame)

        const commitmentCreator = createCommitment(creator.address, 1, ethers.utils.randomBytes(32))
        const gameId = await createGame(gameRPS, creator, commitmentCreator)

        const commitmentPlayer = createCommitment(creator.address, 2, ethers.utils.randomBytes(32))
        await join(gameRPS, gameId, address1, commitmentPlayer)

        const game = await gameRPS.game(gameId)        
        
        expect(game[0]).length(2)
        expect(game[0][0]).equals(creator.address)
        expect(game[0][1]).equals(address1.address)

        expect(game[1][0]).equals(commitmentCreator)
        expect(game[1][1]).equals(commitmentPlayer)

        expect(game[2]).eqls(Array(2).fill(0))
      })

      it("should return reveals", async () => {
        const { gameRPS } = await loadFixture(deployGame)

        const choiceCreator = 1
        const blindingFactorCreator = ethers.utils.randomBytes(32)
        const commitmentCreator = createCommitment(creator.address, choiceCreator, blindingFactorCreator)
        const gameId = await createGame(gameRPS, creator, commitmentCreator)

        const choicePlayer = 2
        const blindingFactorPlayer = ethers.utils.randomBytes(32)
        const commitmentPlayer = createCommitment(address1.address, choicePlayer, blindingFactorPlayer)
        await join(gameRPS, gameId, address1, commitmentPlayer)

        await gameRPS.connect(creator).reveal(gameId, choiceCreator, blindingFactorCreator)
        await gameRPS.connect(address1).reveal(gameId, choicePlayer, blindingFactorPlayer)

        const game = await gameRPS.game(gameId)
        
        expect(game[0]).length(2)
        expect(game[0][0]).equals(creator.address)
        expect(game[0][1]).equals(address1.address)

        expect(game[1][0]).equals(commitmentCreator)
        expect(game[1][1]).equals(commitmentPlayer)

        expect(game[2][0]).equals(choiceCreator)
        expect(game[2][1]).equals(choicePlayer)
      })
    })

    describe("Error", () => {
      it("Should revert if game is not exists", async () => {
        const { gameRPS } = await loadFixture(deployGame)

        await expect(
          gameRPS.game(ethers.utils.randomBytes(32))
        ).revertedWith("Game does not exist")
      })
    })
  })
})
