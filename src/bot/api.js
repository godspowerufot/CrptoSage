const axios = require("axios");
require("dotenv").config();
const { ethers } = require("ethers");

const API_URL = process.env.CMC_API_URL;
const API_KEY = process.env.CMC_API_KEY;
const CHAT_URL = 'https://api.openai.com/v1/chat/completions';

async function getTokenData(tokenName) {
    try {
        console.log(`🔍 Fetching token data for: ${tokenName}`);

        let response = await axios.get(`${API_URL}/cryptocurrency/listings/latest`, {
            headers: { "X-CMC_PRO_API_KEY": API_KEY },
            params: { limit: 200, convert: "USD" }
        });

        console.log("✅ API response received:", response.data);

        if (!response.data || !response.data.data) {
            console.error("❌ Invalid API response format:", response.data);
            return null;
        }

        let token = response.data.data.find(
            (t) => t.name.toLowerCase() === tokenName.toLowerCase() || t.symbol.toLowerCase() === tokenName.toLowerCase()
        );

        if (!token) {
            console.warn(`⚠️ Token '${tokenName}' not found in API data.`);
            return null;
        }

        console.log("✅ Token found:", token);

        return {
            id: token.id,
            name: token.name,
            symbol: token.symbol,
            slug: token.slug,
            rank: token.cmc_rank,
            num_market_pairs: token.num_market_pairs,
            date_added: token.date_added,
            circulating_supply: token.circulating_supply,
            total_supply: token.total_supply,
            max_supply: token.max_supply || "N/A",
            market_cap: token.quote.USD.market_cap.toFixed(2),
            price: token.quote.USD.price.toFixed(6),
            volume_24h: token.quote.USD.volume_24h.toFixed(2),
            percent_change_1h: token.quote.USD.percent_change_1h.toFixed(2),
            percent_change_24h: token.quote.USD.percent_change_24h.toFixed(2),
            percent_change_7d: token.quote.USD.percent_change_7d.toFixed(2),
            last_updated: token.last_updated,
        };
    } catch (error) {
        console.error("❌ Error fetching token data:", error.message);
        return null;
    }
}

const analyzeToken = async (tokenData) => {
  try {
    console.log(`🔍 Fetching token data for: ${tokenData} and analyzing...`);

    const response = await axios.post(
      CHAT_URL,
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a crypto market expert." },
          { role: "user", content: `Analyze the following token data:\n${tokenData}` },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    if (response.data && response.data.choices) {
      return response.data.choices[0].message.content;
    } else {
      console.error("🚨 ChatGPT API Error:", response.data);
      return "⚠️ Error analyzing token. Try again.";
    }
  } catch (error) {
    console.error("❌ ChatGPT API Fetch Error:", error.response?.data || error.message);
    return "⚠️ Unexpected error while analyzing token.";
  }
};
  async function createWallet() {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase, // Optional: Recovery phrase
    };
  }
  
const IMAGE_URL = "https://api.openai.com/v1/images/generations";

// const generateNFTImage = async () => {
//   try {
//     console.log(`Generating AI NFT for theme NFT , ANIMATED CHARACTER, FUTURIDTIC CAR...`);

//     const response = await fetch(IMAGE_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Ensure API key is stored in .env
//       },
//       body: JSON.stringify({
//         prompt: `A futuristic  NFT artwork. High-tech cyberpunk aesthetics, neon lights, Web3 elements, and digital blockchain themes.`,
//         n: 1, // Generate 1 image
//         size: "1024x1024",
//       }),
//     });

//     const data = await response.json();

//     if (data && data.data && data.data.length > 0) {
//       return data.data[0].url; // Return generated image URL
//     } else {
//       console.error("DALL·E API Error:", data);
//       return "🚨 Error: Failed to generate NFT image.";
//     }
//   } catch (error) {
//     console.error("Image Generation Error:", error);
//     return "⚠️ An unexpected error occurred while generating the NFT image.";
//   }
// };





const generateNFTImage = async (text) => {
  try {
    const response = await axios.post(
      'https://api.deepai.org/api/text2img',
      { text },  // Dynamically use the text parameter
      {
        headers: {
          'api-key': process.env.DEEPAI_API_KEY, // Ensure API key is correctly set
        },
      }
    );

    if (response.data && response.data.output_url) {
      console.log("✅ Image Generated:", response.data.output_url);
      return response.data.output_url;
    } else {
      console.error("🚨 DeepAI API Error:", response.data);
      return "🚨 Error: Failed to generate image with DeepAI. Try again!";
    }
  } catch (error) {
    console.error("⚠️ DeepAI API Fetch Error:", error.response?.data || error.message);
    return "⚠️ An unexpected error occurred while generating the image.";
  }
};

// Example usage

// Example usage


// API configuration

// Function to fetch news from the API
async function fetchNews() {
  try {
    const res = await axios.get('https://cryptopanic.com/api/v1/posts/?auth_token=a98f5aae0a0f123e309ffa4a697aea5cc21c4172&filter=rising');
    const newsArray = res.data.results; // Array of news articles

    if (!newsArray || newsArray.length === 0) {
        // If no news found, return a default message
        return [{ title: "No news found", summary: "No relevant crypto news is available at the moment.", url: "" }];
    }

    return newsArray; // Ensure the news array is returned

  } catch (error) {
    console.error("Error fetching news:", error);
    throw new Error("Error fetching news. Please try again later.");
  }
}


module.exports = { getTokenData,analyzeToken ,createWallet,generateNFTImage,fetchNews};



// Example usage
