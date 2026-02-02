require('dotenv').config();

const config = {
    // Basic Bot Info
    BOT_NAME: process.env.BOT_NAME || 'ALONE MD',
    PREFIX: process.env.PREFIX || '.',
    
    // Owner Details
    OWNER_NUMBER: process.env.OWNER_NUMBER || '94703229822',
    OWNER_NAME: process.env.OWNER_NAME || 'AKARSHANA',
    ORGANIZATION: process.env.ORGANIZATION || 'ALONE TECH',
    
    // Database Configuration
    MONGO_URI: process.env.MONGO_URI || 'mongodb+srv://user:password@cluster.mongodb.net/database',
    MONGO_DB: process.env.MONGO_DB || 'CHAMA_MINI_TEDT',
    
    // Links & Media
    GROUP_INVITE_LINK: process.env.GROUP_INVITE_LINK || 'https://chat.whatsapp.com/Hdf6sdiJKo48zsPHgsIbkg',
    CHANNEL_LINK: process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029VbBTCb6E50Ub9aV3133f',
    RCD_IMAGE_PATH: process.env.RCD_IMAGE_PATH || 'https://files.catbox.moe/1m4824.jpeg',
    GITHUB_REPO: process.env.GITHUB_REPO || 'https://github.com/Akarshana0/ALONE-MD-0.1.git',
    
    // Automation Settings
    AUTO_VIEW_STATUS: process.env.AUTO_VIEW_STATUS === 'true',
    AUTO_LIKE_STATUS: process.env.AUTO_LIKE_STATUS === 'true'
};

module.exports = config;
