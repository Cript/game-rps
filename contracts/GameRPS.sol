// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract GameRPS is Ownable {
    event Create(bytes32 gameId, address creator);
    event Join(bytes32 gameId, address player);
    event Reveal(bytes32 gameId, address player, Choice choice);

    enum Choice { None, Rock, Paper, Scissors }

    struct Game {
        address[] players;
        mapping(address => bytes32) commitments;
        mapping(address => Choice) choices;
    }

    mapping (bytes32 => Game) games;

    modifier gameExists(bytes32 gameId) {
        require(games[gameId].players.length != 0, "Game does not exist");
        _;
    }

    modifier gameMember(bytes32 gameId) {
        require(games[gameId].commitments[msg.sender] != "", "Not a member of the game");
        _;
    }

    uint8 private maxPlayers = 2;

    function createGame(bytes32 commitment) public {
        bytes32 gameId = sha256(
            abi.encodePacked(
                msg.sender,
                block.timestamp
            )
        );

        games[gameId].players.push(msg.sender);
        games[gameId].commitments[msg.sender] = commitment;

        emit Create(
            gameId,
            msg.sender
        );
    }

    function join(bytes32 gameId, bytes32 commitment)
        public 
        gameExists(gameId)
    {
        require(games[gameId].players.length < maxPlayers, "Maximum players exceeded");
        require(games[gameId].commitments[msg.sender] == 0, "Already joined");

        games[gameId].players.push(msg.sender);
        games[gameId].commitments[msg.sender] = commitment;

        emit Join(
            gameId,
            msg.sender
        );
    }

    function reveal(bytes32 gameId, Choice choice, bytes32 blindingFactor) 
        public
        gameExists(gameId)
        gameMember(gameId)
    {
        require(games[gameId].players.length == maxPlayers, "Didn't receive all commitments");

        require(
            keccak256(abi.encodePacked(msg.sender, choice, blindingFactor)) == games[gameId].commitments[msg.sender], 
            "Invalid hash"
        );

        games[gameId].choices[msg.sender] = choice;

        emit Reveal(gameId, msg.sender, choice);
    }

    function game(bytes32 gameId)
        public
        view
        gameExists(gameId)
        returns (
            address[] memory,
            bytes32[] memory,
            Choice[] memory
        )
    {
        uint membersCount = games[gameId].players.length;

        bytes32[] memory commitments = new bytes32[](membersCount);
        for (uint i = 0; i < membersCount; i++) {
            commitments[i] = games[gameId].commitments[games[gameId].players[i]];
        }

        Choice[] memory choices = new Choice[](membersCount);
        for (uint i = 0; i < membersCount; i++) {
            choices[i] = games[gameId].choices[games[gameId].players[i]];
        }

        return (
            games[gameId].players,
            commitments,
            choices
        );
    }
}
