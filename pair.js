const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const config = require('./Config');

async function startPairing() {
    // 'session_data' තුළ ඔබගේ සබඳතා දත්ත ගබඩා වේ
    const { state, saveCreds } = await useMultiFileAuthState('session_data');
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        // Browser විස්තර වෙනස් කිරීමෙන් වට්ස්ඇප් එකෙන් බොට්ව හඳුනා ගැනීම අවම කරයි
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    if (!conn.authState.creds.registered) {
        // Config එකෙන් අංකය ලබාගෙන අනවශ්‍ය අක්ෂර ඉවත් කිරීම
        let phoneNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, '');

        if (!phoneNumber) {
            console.log(`❌ Error: කරුණාකර Config.js හි OWNER_NUMBER එක නිවැරදිව ඇතුළත් කරන්න.`);
            process.exit(1);
        }

        console.log(`\n♻️ Requesting Pairing Code for ${phoneNumber} (${config.BOT_NAME})...`);

        setTimeout(async () => {
            try {
                let code = await conn.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n========================================`);
                console.log(`🚀 ${config.BOT_NAME} PAIRING CODE: ${code}`);
                console.log(`========================================\n`);
            } catch (error) {
                console.error("❌ Failed to get pairing code. Please try again later.");
            }
        }, 3000);
    }

    conn.ev.on("creds.update", saveCreds);

    conn.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log(`\n✅ ${config.BOT_NAME} සාර්ථකව සම්බන්ධ වුණා!`);
            console.log(`දැන් 'npm start' මගින් බොට් ක්‍රියාත්මක කරන්න.`);
            process.exit(0);
        }
        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            // Logout වී නොමැති නම් පමණක් නැවත උත්සාහ කරන්න
            if (reason !== DisconnectReason.loggedOut) startPairing();
        }
    });
}

startPairing();
