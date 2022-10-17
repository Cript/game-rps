// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract GameRPS is Ownable {
    event Create(bytes32 gameId, address[] members);
    event Commit(bytes32 gameId, address player);
    event Reveal(bytes32 gameId, address player, Choice choice);

    enum Choice { None, Rock, Paper, Scissors }

    struct PlayerChoice {
        bytes32 commitment;
        Choice choice;
    }

    struct Game {
        address creator;
        address[] members;
        mapping(address => bytes32) commitments;
        mapping(address => Choice) choices;
    }

    mapping (bytes32 => Game) games;

    modifier gameExists(bytes32 gameId) {
        require(games[gameId].creator != address(0), "Game does not exist");
        _;
    }

    modifier gameMember(bytes32 gameId) {
        bool isMember = false;

        for (uint i = 0; i < games[gameId].members.length; i++) {
            if(games[gameId].members[i] == msg.sender) {
                isMember = true;
            }
        }

        require(isMember == true, "Not a member of the game");
        _;
    }

    function createGame(address[] memory members) public {
        bytes32 gameId = sha256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                members
            )
        );

        games[gameId].creator = msg.sender;
        games[gameId].members = members;

        emit Create(
            gameId,
            members
        );
    }

    function haveGame(bytes32 gameId)
        internal
        view
        returns (bool)
    {
        return games[gameId].creator != address(0);
    }

    function commit(bytes32 gameId, bytes32 commitment)
        public 
        gameExists(gameId)
        gameMember(gameId)
    {
        require(games[gameId].commitments[msg.sender] == 0, "Commitment already added");

        games[gameId].commitments[msg.sender] = commitment;

        emit Commit(
            gameId,
            msg.sender
        );
    }

    function reveal(bytes32 gameId, Choice choice, bytes32 blindingFactor) 
        public 
        gameExists(gameId)
        gameMember(gameId)
    {
        uint membersCount = games[gameId].members.length;
        for (uint i = 0; i < membersCount; i++) {
            require(games[gameId].commitments[games[gameId].members[i]] != 0, "Didn't receive all commitments");
        }

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
            address,
            address[] memory,
            bytes32[] memory,
            Choice[] memory
        )
    {
        uint membersCount = games[gameId].members.length;

        bytes32[] memory commitments = new bytes32[](membersCount);
        for (uint i = 0; i < membersCount; i++) {
            commitments[i] = games[gameId].commitments[games[gameId].members[i]];
        }

        Choice[] memory choices = new Choice[](membersCount);
        for (uint i = 0; i < membersCount; i++) {
            choices[i] = games[gameId].choices[games[gameId].members[i]];
        }

        return (
            games[gameId].creator,
            games[gameId].members,
            commitments,
            choices
        );
    }
}
