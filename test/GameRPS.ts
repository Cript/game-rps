import { expect } from "chai"
import { ethers } from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs"
import { deployGame, createGame, commit, commitAll } from "./helpers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

const BYTES_32_EMPTY = "0x0000000000000000000000000000000000000000000000000000000000000000"

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

  describe("CreateGame", function () {
    describe("Success", () => {
      it("Should emit Create event", async function () {
        const { gameRPS } = await loadFixture(deployGame)
  
        await expect(gameRPS.createGame(addresses))
          .to.emit(gameRPS, "Create")
          .withArgs(anyValue, addresses)
      })
    })
  })
  
  describe("Commit", function () {
    describe("Success", () => {
      it("Should emit Commit event", async () => {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, addresses)
  
        await expect(gameRPS.connect(address1).commit(gameId, ethers.utils.randomBytes(32)))
          .to.emit(gameRPS, "Commit")
          .withArgs(gameId, address1.address)
      })
    })

    describe("Error", () => {
      it("Should revert if game is not exists", async function () {
        const { gameRPS } = await loadFixture(deployGame)

        await expect(
          gameRPS.commit(ethers.utils.randomBytes(32), ethers.utils.randomBytes(32))
        ).revertedWith("Game does not exist")
      })

      it("Should revert if user is not a member", async function () {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, addresses)

        await expect(
          gameRPS.commit(gameId, ethers.utils.randomBytes(32))
        ).revertedWith("Not a member of the game")
      })

      it("Should revert if user trying send commitment second time", async function () {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, addresses)

        await gameRPS.connect(address1).commit(gameId, ethers.utils.randomBytes(32))

        await expect(
          gameRPS.connect(address1).commit(gameId, ethers.utils.randomBytes(32))
        ).revertedWith("Commitment already added")
      })
    })
  })
  
  describe("Reveal", function () {
    describe("Success", () => {
      it("Should emit Reveal event", async function () {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, addresses)

        const choice = 1
        const blindingFactor = ethers.utils.randomBytes(32)

        await commit(gameRPS, gameId, address1, choice, blindingFactor)
        await commit(gameRPS, gameId, address2, 1, ethers.utils.randomBytes(32))
        await commit(gameRPS, gameId, address3, 1, ethers.utils.randomBytes(32))
        
        await expect(gameRPS.connect(address1).reveal(gameId, choice, blindingFactor))
          .emit(gameRPS, "Reveal")
          .withArgs(gameId, address1.address, 1)
      })
    })

    describe("Error", () => {
      it("Should revert if game is not exists", async function () {
        const { gameRPS } = await loadFixture(deployGame)
        // const gameId = await createGame(gameRPS, addresses)
        // await commitAll(gameRPS, gameId, [address1, address2, address3])

        await expect(gameRPS.connect(address1).reveal(
          ethers.utils.randomBytes(32), 
          1, 
          ethers.utils.randomBytes(32)
        )).revertedWith("Game does not exist")
      })

      it("Should revert if the sender is not a member", async function () {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, addresses)
        await commitAll(gameRPS, gameId, [address1, address2, address3])

        await expect(
          gameRPS.reveal(gameId, 1, ethers.utils.randomBytes(32))
        ).revertedWith("Not a member of the game")
      })
      
      it("Should revert if not all commitments were added", async function () {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, addresses)
        
        await commit(gameRPS, gameId, address1, 1, ethers.utils.randomBytes(32))
        
        await expect(
          gameRPS.connect(address1).reveal(gameId, 1, ethers.utils.randomBytes(32))
        ).revertedWith("Didn't receive all commitments")
      })
      
      it("Should revert if the hash is invalid", async function () {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, addresses)

        await commitAll(gameRPS, gameId, [address1, address2, address3])

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
        const gameId = await createGame(gameRPS, creator, addresses)

        const game = await gameRPS.game(gameId)
        
        expect(game[0]).equals(creator.address)
        expect(game[1]).eqls(addresses)
        expect(game[2]).eqls(Array(3).fill(BYTES_32_EMPTY, 0, 3))
        expect(game[3]).eqls(Array(3).fill(0, 0, 3))
      })

      it("should return commitments", async () => {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, addresses)

        await commit(gameRPS, gameId, address1, 2, ethers.utils.randomBytes(32))

        const game = await gameRPS.game(gameId)
        
        expect(game[0]).equals(creator.address)
        expect(game[1]).eqls(addresses)

        expect(game[2][0]).not.equals(BYTES_32_EMPTY)
        expect(game[2][1]).equals(BYTES_32_EMPTY)
        expect(game[2][2]).equals(BYTES_32_EMPTY)

        expect(game[3]).eqls(Array(3).fill(0, 0, 3))
      })

      it("should return reveals", async () => {
        const { gameRPS } = await loadFixture(deployGame)
        const gameId = await createGame(gameRPS, creator, addresses)
        
        const choice = 1
        const blindingFactor = ethers.utils.randomBytes(32)

        await commit(gameRPS, gameId, address1, choice, blindingFactor)
        await commit(gameRPS, gameId, address2, 1, ethers.utils.randomBytes(32))
        await commit(gameRPS, gameId, address3, 1, ethers.utils.randomBytes(32))

        await gameRPS.connect(address1).reveal(gameId, choice, blindingFactor)

        const game = await gameRPS.game(gameId)
        
        expect(game[0]).equals(creator.address)
        expect(game[1]).eqls(addresses)

        expect(game[2][0]).not.equals(BYTES_32_EMPTY)
        expect(game[2][1]).not.equals(BYTES_32_EMPTY)
        expect(game[2][2]).not.equals(BYTES_32_EMPTY)        

        expect(game[3][0]).equals(1)
        expect(game[3][1]).equals(0)
        expect(game[3][2]).equals(0)
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
