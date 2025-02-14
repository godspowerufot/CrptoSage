// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CryptoPrediction is ERC721URIStorage, Ownable {
    struct Prediction {
        address user;
        string tokenSymbol;
        bool willRise;
        uint256 timestamp;
        bool checked;
        bool wasCorrect;
        uint256 tokenId; // Token ID for the minted NFT
        uint256 predictionIndex; // Add prediction index
    }

    mapping(address => Prediction[]) public userPredictions;
    mapping(string => uint256) public lastPrices;
    mapping(uint256 => string) public tokenIdToTokenSymbol;
    uint256 private _tokenIds;

    event PredictionMade(address indexed user, string token, bool willRise, uint256 timestamp, uint256 predictionIndex);
    event PredictionChecked(address indexed user, string token, bool wasCorrect);
    event NFTMinted(address indexed user, string token, uint256 tokenId, string imageURL);

    constructor() ERC721("CryptoPredictionNFT", "CPNFT") Ownable(msg.sender) {}

    function makePrediction(string memory tokenSymbol, bool willRise, uint256 priceAtPrediction) public {
        uint256 predictionIndex = userPredictions[msg.sender].length; // Get the current prediction index
        userPredictions[msg.sender].push(Prediction({
            user: msg.sender,
            tokenSymbol: tokenSymbol,
            willRise: willRise,
            timestamp: block.timestamp,
            checked: false,
            wasCorrect: false,
            tokenId: 0, // Initialize tokenId to 0
            predictionIndex: predictionIndex // Store the prediction index
        }));

        lastPrices[tokenSymbol] = priceAtPrediction;
        emit PredictionMade(msg.sender, tokenSymbol, willRise, block.timestamp, predictionIndex);
    }

    function checkPrediction(address user, uint256 currentPrice, string memory imageURL) public {
        require(userPredictions[user].length > 0, "No predictions found");

        for (uint i = 0; i < userPredictions[user].length; i++) {
            Prediction storage p = userPredictions[user][i];

            if (!p.checked && block.timestamp >= p.timestamp + 5 minutes) {
                bool predictionOutcome = (p.willRise && currentPrice > lastPrices[p.tokenSymbol]) ||
                                         (!p.willRise && currentPrice < lastPrices[p.tokenSymbol]);

                p.wasCorrect = predictionOutcome;
                p.checked = true;

                emit PredictionChecked(user, p.tokenSymbol, predictionOutcome);

                if (predictionOutcome) {
                    uint256 newItemId = mintNFT(user, imageURL);
                    p.tokenId = newItemId; // Store the tokenId in the Prediction struct
                    tokenIdToTokenSymbol[newItemId] = p.tokenSymbol; // Map tokenId to tokenSymbol
                    emit NFTMinted(user, p.tokenSymbol, newItemId, imageURL);
                }
            }
        }
    }

    function _mintNFT(address recipient, string memory tokenURI) internal returns (uint256) {
        _tokenIds++;
        uint256 newItemId = _tokenIds;

        _safeMint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }

    function mintNFT(address recipient, string memory tokenURI) public returns (uint256) {
        return _mintNFT(recipient, tokenURI);
    }

    // ✅ Function to get tokenId for a specific user and prediction index
    function getTokenId(address user, uint256 predictionIndex) public view returns (uint256) {
        require(predictionIndex < userPredictions[user].length, "Invalid prediction index");
        return userPredictions[user][predictionIndex].tokenId;
    }

    // ✅ Function to get prediction index for a specific user and token symbol
    function getPredictionIndex(address user, string memory tokenSymbol) public view returns (uint256) {
        for (uint i = 0; i < userPredictions[user].length; i++) {
            if (keccak256(bytes(userPredictions[user][i].tokenSymbol)) == keccak256(bytes(tokenSymbol))) {
                return userPredictions[user][i].predictionIndex;
            }
        }
        revert("Prediction not found");
    }
}