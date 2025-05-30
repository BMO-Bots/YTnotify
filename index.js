const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const config = {
    token: process.env.DISCORD_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
    youtubeApiKey: process.env.YOUTUBE_API_KEY,
    youtubeChannels: [
        process.env.YOUTUBE_CHANNEL_1,
        process.env.YOUTUBE_CHANNEL_2
    ],
    roles: {
        longVideo: process.env.ROLE_LONG_VIDEO,
        shortVideo: process.env.ROLE_SHORT_VIDEO
    }
};

function validateConfig() {
    const requiredFields = [
        'token', 'channelId', 'youtubeApiKey', 
        'roles.longVideo', 'roles.shortVideo'
    ];
    
    for (const field of requiredFields) {
        const value = field.includes('.') 
            ? config[field.split('.')[0]][field.split('.')[1]]
            : config[field];
        
        if (!value) {
            console.error(`❌ Configurazione mancante: ${field}`);
            process.exit(1);
        }
    }
    
    if (!config.youtubeChannels[0] || !config.youtubeChannels[1]) {
        console.error('❌ Configurazione mancante: canali YouTube');
        process.exit(1);
    }
    
    console.log('✅ Configurazione validata');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let lastVideoIds = {};
const STORAGE_FILE = path.join(__dirname, 'lastVideos.json');

// Funzione per caricare gli ultimi video IDs dal file
async function loadLastVideoIds() {
    try {
        const data = await fs.readFile(STORAGE_FILE, 'utf8');
        const stored = JSON.parse(data);
        console.log('📁 Caricati ultimi video IDs dal file');
        return stored;
    } catch (error) {
        console.log('📁 File lastVideos.json non trovato, inizializzo vuoto');
        return {};
    }
}

// Funzione per salvare gli ultimi video IDs nel file
async function saveLastVideoIds() {
    try {
        await fs.writeFile(STORAGE_FILE, JSON.stringify(lastVideoIds, null, 2));
        console.log('💾 Salvati ultimi video IDs nel file');
    } catch (error) {
        console.error('❌ Errore nel salvare lastVideos.json:', error);
    }
}

function parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

async function getLatestVideo(channelId) {
    try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${config.youtubeApiKey}&channelId=${channelId}&part=snippet&order=date&maxResults=1&type=video`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();
        
        if (!searchData.items || searchData.items.length === 0) {
            return null;
        }
        
        const video = searchData.items[0];
        
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${config.youtubeApiKey}&id=${video.id.videoId}&part=contentDetails,snippet,statistics`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (!detailsData.items || detailsData.items.length === 0) {
            return null;
        }
        
        const videoDetails = detailsData.items[0];
        const durationSeconds = parseDuration(videoDetails.contentDetails.duration);
        
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?key=${config.youtubeApiKey}&id=${channelId}&part=snippet`;
        const channelResponse = await fetch(channelUrl);
        const channelData = await channelResponse.json();
        
        let channelIcon = null;
        if (channelData.items && channelData.items.length > 0) {
            channelIcon = channelData.items[0].snippet.thumbnails.default.url;
        }
        
        return {
            id: video.id.videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            thumbnail: video.snippet.thumbnails.high.url,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
            publishedAt: video.snippet.publishedAt,
            channelTitle: video.snippet.channelTitle,
            channelId: channelId,
            channelIcon: channelIcon,
            duration: durationSeconds,
            formattedDuration: formatDuration(durationSeconds),
            viewCount: videoDetails.statistics.viewCount || '0'
        };
    } catch (error) {
        console.error(`Errore nel recupero video per canale ${channelId}:`, error);
        return null;
    }
}

function createVideoEmbed(video, isTest = false) {
    const isLongVideo = video.duration >= 120;
    const roleTag = isLongVideo ? `<@&${config.roles.longVideo}>` : `<@&${config.roles.shortVideo}>`;
    const publishDate = new Date(video.publishedAt);
    const formattedDate = `${publishDate.getDate().toString().padStart(2, '0')}/${(publishDate.getMonth() + 1).toString().padStart(2, '0')}/${publishDate.getFullYear()} ${publishDate.getHours().toString().padStart(2, '0')}:${publishDate.getMinutes().toString().padStart(2, '0')}`;
    const descriptionLines = video.description.split('\n').slice(0, 2).join('\n');
    const shortDescription = descriptionLines.length > 200 ? 
        descriptionLines.substring(0, 200) + '...' : 
        descriptionLines;    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: video.channelTitle,
            iconURL: video.channelIcon || undefined
        })
        .setTitle(video.title)
        .setURL(video.url)
        .setDescription(shortDescription || 'Nessuna descrizione disponibile')
        .setThumbnail(video.channelIcon || undefined)
        .setImage(video.thumbnail)
        .setColor('#FF0000')
        .setFooter({ 
            text: `YouTube • jes.is-a.dev • ${formattedDate}`
        });
    
    return { embed, roleTag, isTest, isLongVideo };
}

async function sendVideoNotification(video, isTest = false) {
    try {
        const channel = await client.channels.fetch(config.channelId);
        const { embed, roleTag, isLongVideo } = createVideoEmbed(video, isTest);
        
        let messageContent;
          if (isTest) {
            if (isLongVideo) {
                messageContent = `${roleTag} **Hey!**
:clapper: C'è un nuovo Video su ${video.channelTitle}

Titolo: **"${video.title}"**
Vallo a vedere **ORA!**

${video.url}

🧪 **TEST MODE**`;
            } else {
                messageContent = `${roleTag} **Hey!**
:mobile_phone: C'è un nuovo Short su ${video.channelTitle}

Titolo: **"${video.title}"**
Vallo a vedere **ORA!**

${video.url}

🧪 **TEST MODE**`;
            }
        } else {
            if (isLongVideo) {
                messageContent = `${roleTag} **Hey!**
:clapper: C'è un nuovo Video su ${video.channelTitle}

Titolo: **"${video.title}"**
Vallo a vedere **ORA!**

${video.url}`;
            } else {
                messageContent = `${roleTag} **Hey!**
:mobile_phone: C'è un nuovo Short su ${video.channelTitle}

Titolo: **"${video.title}"**
Vallo a vedere **ORA!**

${video.url}`;
            }
        }
        
        await channel.send({
            content: messageContent,
            embeds: [embed]
        });
        
        console.log(`✅ Notifica inviata per: ${video.title}`);
    } catch (error) {
        console.error('Errore nell\'invio della notifica:', error);
    }
}

async function checkForNewVideos() {
    console.log('🔍 Controllo nuovi video...');
    
    for (const channelId of config.youtubeChannels) {
        try {
            const latestVideo = await getLatestVideo(channelId);
            
            if (!latestVideo) {
                console.log(`⚠️ Nessun video trovato per canale ${channelId}`);
                continue;
            }
            
            // Controlla se questo video è già stato processato
            if (lastVideoIds[channelId] !== latestVideo.id) {
                // Solo se non è la prima esecuzione (abbiamo un video precedente salvato)
                if (lastVideoIds[channelId]) {
                    console.log(`🆕 Nuovo video rilevato! ${latestVideo.title}`);
                    await sendVideoNotification(latestVideo);
                } else {
                    console.log(`📹 Primo video rilevato per ${channelId}: ${latestVideo.title} (non invio notifica)`);
                }
                
                // Aggiorna l'ID dell'ultimo video e salva
                lastVideoIds[channelId] = latestVideo.id;
                await saveLastVideoIds();
                console.log(`💾 Aggiornato ultimo video per ${channelId}: ${latestVideo.title}`);
            } else {
                console.log(`✅ Nessun nuovo video per ${channelId}`);
            }
        } catch (error) {
            console.error(`❌ Errore nel controllo canale ${channelId}:`, error);
        }
    }
}

client.once('ready', async () => {
    console.log(`🤖 Bot connesso come ${client.user.tag}!`);
    
    // Carica gli ultimi video IDs salvati
    lastVideoIds = await loadLastVideoIds();
    
    // Inizializza i canali se non esistono nel file salvato
    for (const channelId of config.youtubeChannels) {
        if (!lastVideoIds[channelId]) {
            lastVideoIds[channelId] = null;
        }
    }
    
    await checkForNewVideos();
    setInterval(checkForNewVideos, 30 * 60 * 1000);
    console.log('⏰ Controllo automatico attivato (ogni 30 minuti)');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!test123') {
        try {
            await message.reply('🧪 Esecuzione test in corso...');
            for (const channelId of config.youtubeChannels) {
                const latestVideo = await getLatestVideo(channelId);
                if (latestVideo) {
                    await sendVideoNotification(latestVideo, true);
                } else {
                    await message.channel.send(`❌ Impossibile recuperare l'ultimo video per il canale ${channelId}`);
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            await message.channel.send('✅ Test completato! Controlla i messaggi sopra per vedere il nuovo stile.');
        } catch (error) {
            console.error('Errore nel comando test:', error);
            await message.reply('❌ Errore durante l\'esecuzione del test.');
        }
    }
    
    if (message.content === '!reset') {
        try {
            lastVideoIds = {};
            for (const channelId of config.youtubeChannels) {
                lastVideoIds[channelId] = null;
            }
            await saveLastVideoIds();
            await message.reply('🔄 Cache dei video resettata! Il prossimo controllo rileverà i video attuali come nuovi.');
            console.log('🔄 Cache video resettata manualmente');
        } catch (error) {
            console.error('Errore nel comando reset:', error);
            await message.reply('❌ Errore durante il reset della cache.');
        }
    }
    
    if (message.content === '!status') {
        try {
            let statusMessage = '📊 **Status Bot YouTube Notifier**\n\n';
            for (const channelId of config.youtubeChannels) {
                const latestVideo = await getLatestVideo(channelId);
                if (latestVideo) {
                    statusMessage += `🎬 **${latestVideo.channelTitle}**\n`;
                    statusMessage += `Ultimo video: ${latestVideo.title}\n`;
                    statusMessage += `ID salvato: ${lastVideoIds[channelId] || 'Nessuno'}\n`;
                    statusMessage += `Nuovo video?: ${lastVideoIds[channelId] !== latestVideo.id ? '✅ Sì' : '❌ No'}\n\n`;
                } else {
                    statusMessage += `❌ Errore nel recupero info per canale ${channelId}\n\n`;
                }
            }
            await message.reply(statusMessage);
        } catch (error) {
            console.error('Errore nel comando status:', error);
            await message.reply('❌ Errore durante il controllo dello status.');
        }
    }
});

client.on('error', (error) => {
    console.error('Errore Discord:', error);
});

async function startBot() {
    validateConfig();
    try {
        await client.login(config.token);
    } catch (error) {
        console.error('❌ Errore nel login:', error);
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    console.log('\n🛑 Spegnimento bot...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Spegnimento bot...');
    client.destroy();
    process.exit(0);
});

startBot();
