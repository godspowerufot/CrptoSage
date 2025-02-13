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
    }

    mapping(address => Prediction[]) public userPredictions;
    mapping(string => uint256) public lastPrices;
    uint256 private _tokenIds;

    event PredictionMade(address indexed user, string token, bool willRise, uint256 timestamp);
    event PredictionChecked(address indexed user, string token, bool wasCorrect);
    event NFTMinted(address indexed user, string token, uint256 tokenId, string imageURL);

    // ✅ Constructor passing values to ERC721 and Ownable
    constructor() ERC721("CryptoPredictionNFT", "CPNFT") Ownable(msg.sender) {}

    function makePrediction(string memory tokenSymbol, bool willRise, uint256 priceAtPrediction) public {
        userPredictions[msg.sender].push(Prediction({
            user: msg.sender,
            tokenSymbol: tokenSymbol,
            willRise: willRise,
            timestamp: block.timestamp,
            checked: false,
            wasCorrect: false
        }));

        lastPrices[tokenSymbol] = priceAtPrediction;
        emit PredictionMade(msg.sender, tokenSymbol, willRise, block.timestamp);
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
                    emit NFTMinted(user, p.tokenSymbol, newItemId, imageURL);
                }
            }
        }
    }

    // ✅ Mint NFT function

function _mintNFT(address recipient, string memory tokenURI) internal returns (uint256) {
    _tokenIds++;
    uint256 newItemId = _tokenIds;

    _safeMint(recipient, newItemId);
    
    // Attempt to set the token URI safely
    bool success = _safeSetTokenURI(newItemId, tokenURI);
    require(success, "Error setting Token URI!");

    return newItemId;
}

function _safeSetTokenURI(uint256 tokenId, string memory tokenURI) internal returns (bool) {
    // This function ensures we don't revert if _setTokenURI fails
    if (bytes(tokenURI).length > 0) {
        _setTokenURI(tokenId, tokenURI);
        return true;
    }
    return false;
}



    function mintNFT(address recipient, string memory tokenURI) public  returns (uint256) {
    return _mintNFT(recipient, tokenURI);
}

}

