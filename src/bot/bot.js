const { Telegraf } = require("telegraf");
require("dotenv").config();
const { handleCommands } = require("./commands");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Load all command handlers
handleCommands(bot);

// ✅ Start bot
bot.launch()
  .then(() => console.log("🚀 Bot is running!"))
  .catch((err) => console.error("❌ Bot launch error:", err));
