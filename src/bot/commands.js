const { ethers } = require("ethers");
const { parseUnits } = ethers;
const { Markup } = require("telegraf");
const { getTokenData, analyzeToken, fetchNews, createWallet, generateNFTImage } = require("./api");

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const contractData = require("../../artifacts/contracts/prediction.sol/CryptoPrediction.json");
const contractABI = contractData.abi;
const contractAddress = "0xCB5A2D11192B555c3D84c3880d41BBb286BE16E4";

const userWallets = {};  // Stores user wallets
const userState = {}; // Stores user actions (e.g., checking price, analyzing, predicting)

function handleCommands(bot) {
  bot.start((ctx) => {
    ctx.reply(
      "👋 Welcome to the *AI Crypto Bot*!\n\n📌 This bot helps you analyze crypto prices, predict trends, and mint NFTs.\n\n🔽 *Choose an action below to begin:*",
      Markup.inlineKeyboard([
        [Markup.button.callback("🪙 Check Token Price", "check_price")],
        [Markup.button.callback("📊 Analyze Token", "analyze_token")],
        [Markup.button.callback("🔮 Make a Prediction", "make_prediction")],
        [Markup.button.callback("📰 Get Crypto News", "crypto_news")],
        [Markup.button.callback("💼 Create Wallet", "create_wallet")],
        [Markup.button.callback("ℹ️ Help", "help")],
      ])
    );
  });

  // Handle Crypto News
  bot.action("crypto_news", async (ctx) => {
    try {
      const newsList = await fetchNews();
      let response = "📰 *Latest Crypto News* 📰\n\n";
      newsList.forEach((news, index) => {
        response += `📌 *${index + 1}. ${news.title}*\n${news.slug}\n🔗 [Read More](${news.url})\n\n`;
      });
      ctx.reply(response || "⚠️ No news available.", { parse_mode: "Markdown" });
    } catch (error) {
      ctx.reply("⚠️ Error fetching news. Try again later.");
    }
  });

  // Handle Create Wallet
  bot.action("create_wallet", async (ctx) => {
    await ctx.reply("⏳ Creating your wallet...");
    const wallet = await createWallet();
    userWallets[ctx.from.id] = wallet;
    ctx.reply(
      `✅ *Wallet Created!*\n\n🔑 *Address:* \`${wallet.address}\`\n🔐 *Private Key:* \`${wallet.privateKey}\`\n📝 *Mnemonic:* \`${wallet.mnemonic}\`\n⚠️ *Keep your keys safe!*`,
      { parse_mode: "Markdown" }
    );
  });

  // Handle Check Token Price
  bot.action("check_price", async (ctx) => {
    userState[ctx.from.id] = "checking_price"; // Track state
    ctx.reply("🪙 Enter token symbol (e.g., BTC, ETH)");
  });

  // Handle Analyze Token
  bot.action("analyze_token", async (ctx) => {
    userState[ctx.from.id] = "analyzing_token"; // Track state
    ctx.reply("📊 Enter token symbol to analyze:");
  });

  // Handle Make Prediction
  bot.action("make_prediction", async (ctx) => {
    userState[ctx.from.id] = "making_prediction"; // Track state
    ctx.reply("🔮 Enter token symbol for prediction:");
  });

  // Handle Text Input (Avoid Conflicts)
  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    const userAction = userState[userId];

    if (!userAction) return; // Ignore if no action is set

    const tokenSymbol = ctx.message.text.toUpperCase();

    switch (userAction) {
      case "checking_price":
        ctx.reply(`⏳ Fetching price for *${tokenSymbol}*...`, { parse_mode: "Markdown" });
        try {
          const data = await getTokenData(tokenSymbol);
          if (!data) return ctx.reply("⚠️ Token not found!");

          ctx.reply(
            `📊 Token Data for *${data.name}*:\n💰 Price: $${data.price}\n🏦 Market Cap: $${data.market_cap}\n⏳ Change (1h): ${data.percent_change_1h}%\n⏳ Change (24h): ${data.percent_change_24h}%\n⏳ Change (7d): ${data.percent_change_7d}%`,
            { parse_mode: "Markdown" }
          );
        } catch (error) {
          ctx.reply("⚠️ Error fetching price.");
        }
        break;

      case "analyzing_token":
        ctx.reply(`⏳ Fetching data for *${tokenSymbol}*...`, { parse_mode: "Markdown" });
        try {
          const data = await getTokenData(tokenSymbol);
          if (!data) return ctx.reply("⚠️ Token not found!");
          const tokenInfo =` 
          Token: ${data.name} (${data.symbol})
          💰 Price: $${data.price}
          🏦 Market Cap: $${data.market_cap}
          ⏳ Change (1h): ${data.percent_change_1h}%
          ⏳ Change (24h): ${data.percent_change_24h}%
          ⏳ Change (7d): ${data.percent_change_7d}%
             ` ;          ctx.reply("🔍 Analyzing... please wait...");
          const analysis = await analyzeToken(tokenInfo);
          ctx.reply(`📊 *AI Analysis for ${tokenSymbol}:*\n${analysis}`, { parse_mode: "Markdown" });
        } catch (error) {
          ctx.reply("⚠️ Error analyzing token.");
        }
        break;

      case "making_prediction":
        ctx.reply(
          `📈 *Predict ${tokenSymbol}'s price movement:*`,
          Markup.inlineKeyboard([
            [Markup.button.callback("⬆️ Up", `predict_${tokenSymbol}_up`)],
            [Markup.button.callback("⬇️ Down", `predict_${tokenSymbol}_down`)],
          ])
        );
        break;

      default:
        ctx.reply("⚠️ Invalid action.");
    }

    // Reset user state after handling action
    delete userState[userId];
  });

  bot.action(/^predict_(.+)_(up|down)$/, async (ctx) => {
      const userId = ctx.from.id;
      if (!userWallets[userId]) {
          ctx.reply("⚠️ *You need to create a wallet first!*", Markup.inlineKeyboard([
              [Markup.button.callback("Create Wallet", "create_wallet")]
          ]));
          return;
      }
  
      const [_, tokenSymbol, direction] = ctx.match;
      const willRise = direction === "up";
      const userWallet = new ethers.Wallet(userWallets[userId].privateKey, provider);
      const contract = new ethers.Contract(contractAddress, contractABI, userWallet);
  
      try {
          ctx.reply("⏳ *Fetching token price...* 🧐");
          const tokenData = await getTokenData(tokenSymbol);
          const price = tokenData?.price;
          if (!price) {
              ctx.reply("⚠️ *Failed to fetch token price.*", Markup.inlineKeyboard([
                  [Markup.button.callback("Try Again", "retry_fetch")]
              ]));
              return;
          }
  
          const priceFormatted = parseUnits(price.toString(), 18);
          ctx.reply("🔮 Recording your prediction... 📝");
  
          const tx = await contract.makePrediction(tokenSymbol, willRise, priceFormatted);
          await tx.wait();
  
          ctx.reply(`✅ *Prediction Recorded Successfully!* 🎯\n\n🪙 Token: ${tokenSymbol}\n📈 Prediction: ${willRise ? "UP 🚀" : "DOWN 📉"}  https://explorer.creatorchain.io/tx/${tx.hash}`,
              Markup.inlineKeyboard([
                  [Markup.button.url("View on Creatorscan", `https://explorer.creatorchain.io/tx/${tx.hash}`)]
              ])
          );
  
          ctx.reply("⏳ Waiting 5 minutes before checking prediction... ⏳");
          setTimeout(async () => {
              ctx.reply("⚠️ Checking your prediction now... 🔍");
              const updatedData = await getTokenData(tokenSymbol);
              if (!updatedData || !updatedData.price) {
                  ctx.reply("⚠️ *Failed to fetch updated price.*");
                  return;
              }
  
              const currentPriceFormatted = parseUnits(updatedData.price.toString(), 18);
              const imageURL = await generateNFTImage();
  
              try {
                  const checkTx = await contract.checkPrediction(userWallet.address, currentPriceFormatted, imageURL);
                  await checkTx.wait();
  
                  const events = await contract.queryFilter("PredictionChecked", -100000, "latest");
                  const userEvents = events.filter((e) => e.args.user.toLowerCase() === userWallet.address.toLowerCase() && e.args.token === tokenSymbol);
                  const latestEvent = userEvents[userEvents.length - 1];
  
                  if (latestEvent) {
                      const wasCorrect = latestEvent.args.wasCorrect;
                      if (wasCorrect) {
  
                          ctx.replyWithPhoto(imageURL, {
                              caption: `🎉 Congratulations!* 🎊\n\n✅ Your prediction for *${tokenSymbol}* was correct! 🚀\n🎨 *Minting your AI-generated NFT now...`,
                              parse_mode: "Markdown",
                          
                          });
                          try {
                            ctx.reply("⏳ Minting your NFT...🎨");
                            const gasLimit = 300000;
                            const mintTx = await contract.mintNFT(userWallet.address, tokenSymbol, { gasLimit });
                            await mintTx.wait();
                    
                            ctx.reply(
                                `✅ NFT Minted Successfully! 🖼️`,
                              
                            );
                            ctx.reply(`https://explorer.creatorchain.io/tx/${mintTx.hash}`,
                                Markup.inlineKeyboard([
                                    [Markup.button.url("View NFT", `https://testnets.opensea.io/assets/${contractAddress}/${userWallet.address}`)],
                                    [Markup.button.url("View Tx Hash", `https://explorer.creatorchain.io/tx/${mintTx.hash}`)]
                                ]))
                        } catch (error) {
                            console.error("Error minting NFT:", error);
                            ctx.reply("⚠️ *Error minting NFT. Please try again.*");
                        }
                      } else {
                          ctx.reply(`😞 *Unfortunately, your prediction for ${tokenSymbol} was incorrect.* ❌`);
                      }
                  } else {
                      ctx.reply("⚠️ *Unable to retrieve prediction result.*");
                  }
              } catch (error) {
                  console.error("Error checking prediction:", error);
                  ctx.reply("⚠️ *Error checking prediction. Please try again later.*");
              }
          }, 5 * 60 * 1000);
      } catch (error) {
          console.error("Prediction Error:", error);
          ctx.reply("⚠️ *Error making prediction. Please try again.*");
      }
  });
  
}

module.exports = { handleCommands };
