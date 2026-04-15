// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Greeting {
    string public greeting;
    address public owner;

    event GreetingChanged(address indexed updatedBy, string oldGreeting, string newGreeting);

    constructor(string memory initialGreeting) {
        owner = msg.sender;
        greeting = initialGreeting;
    }

    function getGreeting() external view returns (string memory) {
        return greeting;
    }

    function setGreeting(string calldata newGreeting) external {
        string memory oldGreeting = greeting;
        greeting = newGreeting;

        emit GreetingChanged(msg.sender, oldGreeting, newGreeting);
    }
}
