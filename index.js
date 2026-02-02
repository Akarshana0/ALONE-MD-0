const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode-terminal");
const express = require('express');
const path = require('path');
const config = require('./Config');
const handler = require('./msg');

const app = express();
const PORT = process.env.PORT || 3000;
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });

// Store එක file එකකට save කිරීම
store.readFromFile('./baileys_store.json');
setInterval(() => {
    store.writeToFile('./baileys_store.json');
}, 10_000);

// --- 1. වෙබ් අතුරුමුහුණත (Express Server) ---

// Pairing Code ලබාගැනීම සඳහා වන API එක
app.get('/code', async (req, res) => {
    let num = req.query.number;
    if (!num) return res.status(400).json({ error: "Number is required" });

    try {
        // Pairing code එකක් ලබාගැනීමට තාවකාලික session එකක් භාවිතා කිරීම
        const { state } = await useMultiFileAuthState("temp_session");
        const conn = makeWASocket({
            auth: state,
            logger: pino({ level: "silent" }),
            browser: ["ALONE MD", "Chrome", "1.0.0"]
        });

        if (!conn.authState.creds.registered) {
            let code = await conn.requestPairingCode(num);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            res.json({ code: code });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to generate code" });
    }
});

// මුල් පිටුව (main.html) පෙන්වීම
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

// --- 2. බොට්ගේ ප්‍රධාන ක්‍රියාකාරීත්වය (WhatsApp Bot) ---

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session_data");
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" }),
        generateHighQualityLinkPreview: true,
        browser: ["ALONE MD", "Chrome", "1.0.0"],
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg.message || undefined;
            }
            return { conversation: "ALONE MD" };
        }
    });

    store.bind(conn.ev);

    conn.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("📌 Scan the QR code below:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Connection lost. Reconnecting...", shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅ ALONE MD Connected Successfully!");
        }
    });

    conn.ev.on("creds.update", saveCreds);

    conn.ev.on("messages.upsert", async (chatUpdate) => {
        for (const msg of chatUpdate.messages) {
            if (!msg.message) continue;

            // ස්වයංක්‍රීයව Status බැලීම (Config එක මත තීරණය වේ)
            if (config.AUTO_VIEW_STATUS && msg.key.remoteJid === 'status@broadcast') {
                await conn.readMessages([msg.key]);
                console.log(`✅ Viewed Status from: ${msg.pushName}`);
            }

            // Msg.js වෙත යොමු කිරීම (Command Handling)
            await handler(conn, { messages: [msg], type: chatUpdate.type });
        }
    });
}

// දෙකම එකවර ආරම්භ කිරීම
app.listen(PORT, () => {
    console.log(`🌐 Server running on http://localhost:${PORT}`);
});

startBot();
