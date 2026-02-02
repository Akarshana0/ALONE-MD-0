const axios = require('axios');
const yts = require('yt-search');
const config = require('./Config');

module.exports = async (conn, chatUpdate) => {
    try {
        const msg = chatUpdate.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const type = Object.keys(msg.message)[0];
        
        const messageContent = (type === 'conversation') ? msg.message.conversation : 
                               (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : 
                               (type === 'imageMessage') ? msg.message.imageMessage.caption : 
                               (type === 'videoMessage') ? msg.message.videoMessage.caption : '';
        
        const prefix = config.PREFIX; 
        const isCmd = messageContent.startsWith(prefix);
        if (!isCmd) return;

        const command = messageContent.slice(prefix.length).trim().split(/ +/).shift().toLowerCase();
        const args = messageContent.trim().split(/ +/).slice(1);

        switch (command) {
            case 'ping': {
                const start = Date.now();
                const pingMsg = await conn.sendMessage(from, { text: "Testing Speed... 💨" }, { quoted: msg });
                const end = Date.now();
                await conn.sendMessage(from, { text: `*Pong!* 🏓\nLatency: ${end - start}ms`, edit: pingMsg.key });
                break;
            }

            case 'owner': {
                const cleanNumber = config.OWNER_NUMBER.replace(/\D/g, '');
                const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${config.OWNER_NAME}\nORG:${config.ORGANIZATION};\nTEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\nEND:VCARD`;
                await conn.sendMessage(from, { contacts: { displayName: config.OWNER_NAME, contacts: [{ vcard }] } }, { quoted: msg });
                await conn.sendMessage(from, { text: `*🖤 ${config.BOT_NAME} OWNER 🖤*\n\n👤 Name: ${config.OWNER_NAME}\n📞 Number: https://wa.me/${cleanNumber}` }, { quoted: msg });
                break;
            }

            case 'song':
            case 'play': {
                if (!args[0]) return await conn.sendMessage(from, { text: "කරුණාකර සින්දුවක නමක් ලබා දෙන්න. 🎧" }, { quoted: msg });
                await conn.sendMessage(from, { text: "Searching for your song... 🔎" }, { quoted: msg });
                const search = await yts(args.join(" "));
                const video = search.videos[0];
                if (!video) return await conn.sendMessage(from, { text: "සින්දුව සොයාගත නොහැකි විය. ❌" }, { quoted: msg });

                const res = await axios.get(`https://api.darksite.biz/api/download/ytmp3?url=${video.url}`);
                const downloadUrl = res.data.result.download_url;
                await conn.sendMessage(from, { audio: { url: downloadUrl }, mimetype: 'audio/mpeg', fileName: `${video.title}.mp3` }, { quoted: msg });
                break;
            }

            case 'yt': {
                if (!args[0]) return await conn.sendMessage(from, { text: "කරුණාකර YouTube link එකක් ලබා දෙන්න." }, { quoted: msg });
                const res = await axios.get(`https://api.darksite.biz/api/download/ytmp4?url=${args[0]}`);
                await conn.sendMessage(from, { video: { url: res.data.result.download_url }, caption: "> *ALONE MD YT DL*" }, { quoted: msg });
                break;
            }

            case 'fb': {
                if (!args[0]) return await conn.sendMessage(from, { text: "කරුණාකර Facebook link එකක් ලබා දෙන්න. 🔗" }, { quoted: msg });
                const res = await axios.get(`https://api.darksite.biz/api/download/fb?url=${args[0]}`);
                const downloadUrl = res.data.result.hd || res.data.result.sd;
                await conn.sendMessage(from, { video: { url: downloadUrl }, caption: "> *ALONE MD FB DL*" }, { quoted: msg });
                break;
            }

            case 'vv': {
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                const viewOnce = quoted?.viewOnceMessageV2?.message || quoted?.viewOnceMessage?.message;
                if (!viewOnce) return await conn.sendMessage(from, { text: "මෙය View Once message එකක් නෙවෙයි." }, { quoted: msg });
                const mediaType = Object.keys(viewOnce)[0];
                const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                const stream = await downloadContentFromMessage(viewOnce[mediaType], mediaType.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                if (mediaType === 'imageMessage') await conn.sendMessage(from, { image: buffer, caption: "Success! ✅" }, { quoted: msg });
                else if (mediaType === 'videoMessage') await conn.sendMessage(from, { video: buffer, caption: "Success! ✅" }, { quoted: msg });
                break;
            }
        }
    } catch (err) { console.error(err); }
};
