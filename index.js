const { Client, Util, MessageEmbed } = require("discord.js");
const YouTube = require("simple-youtube-api");
const ytdl = require("ytdl-core");
require("dotenv").config();
require("./server.js");

const bot = new Client({
    disableMentions: "all"
});


const PREFIX = process.env.PREFIX;
const youtube = new YouTube(process.env.YTAPI_KEY);
const queue = new Map();

bot.on("warn", console.warn);
bot.on("error", console.error);
bot.on("ready", () => console.log(`[READY] ${bot.user.tag} has been successfully booted up!`));
bot.on("shardDisconnect", (event, id) => console.log(`[SHARD] Shard ${id} disconnected (${event.code}) ${event}, trying to reconnect...`));
bot.on("shardReconnecting", (id) => console.log(`[SHARD] Shard ${id} reconnecting...`));


bot.on("message", async (message) => { // eslint-disable-line
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.split(" ");
    const searchString = args.slice(1).join(" ");
    const url = args[1] ? args[1].replace(/<(.+)>/g, "$1") : "";
    const serverQueue = queue.get(message.guild.id);

    let command = message.content.toLowerCase().split(" ")[0];
    command = command.slice(PREFIX.length);
    if (command === "help" || command === "cmd") {
        const helpembed = new MessageEmbed()
            .setColor("RANDOM")
            .setAuthor(bot.user.tag, bot.user.displayAvatarURL())//*h* bo bold krdn
            .setDescription(` 
__**Command list**__
> 〔 **?QGPlay** 〕: ** To Play A Music**
> 〔 **?QGSkip,?QGs** 〕: ** To Skip A Music**
> 〔 **?QGNowplaying,?QGnp** 〕: ** To Show Which Music Is Playing Now**
> 〔 **?QGPause** 〕: ** To Pause A Music**
> 〔 **?QGResume** 〕: ** To Resume The Paused Music**
> 〔 **?QGVolume, ?QGvol** 〕: ** To Set The Music Volume**
> 〔 **?QGJoin,?QGcome,?QGwara** 〕: ** To Join The BOT To Your Voice Channel**
> 〔 **?QGdisconnect,?QGleave,?QGbro** 〕: ** To Leave The BOT From Your Voice Channel** `)
            .setFooter("©️ 2020 Qasabakan", "https://media.discordapp.net/attachments/741148385121140806/741983990814343238/qasab.gif");
       message.channel.send(helpembed);
    }
    if (command === "play" || command === "p") {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send({embed: {color: "RED", description: ":x: **You have to be in a voice channel to use this command.**"}});
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT")) {
            return message.channel.send({embed: {color: "RED", description: "Sorry, but I need a **`CONNECT`** permission to proceed!"}});
        }
        if (!permissions.has("SPEAK")) {
            return message.channel.send({embed: {color: "RED", description: "Sorry, but I need a **`SPEAK`** permission to proceed!"}});
        }
        if (!url || !searchString) return message.channel.send({embed: {color: "RED", description: ":x: Invalid usage Use (?QGplay [Link or query])"}});
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return message.channel.send({embed: {
                    color: "GREEN",
                    description: `✅  **|**  Playlist: **\`${playlist.title}\`** has been added to the queue`
            }});
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    var video = await youtube.getVideoByID(videos[0].id);
                    if (!video) return message.channel.send({embed: {color: "RED", description: ":x: **No matches**"}});
                } catch (err) {
                    console.error(err);
                    return message.channel.send({embed: {color: "RED", description: ":x: **No matches**"}});
                }
            }
            return handleVideo(video, message, voiceChannel);
        }
    }
    if (command === "search" || command === "sc") {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.channel.send({embed: {color: "RED", description: ":x: **You have to be in a voice channel to use this command.**"}});
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT")) {
            return message.channel.send({embed: {color: "RED", description: "Sorry, but I need a **`CONNECT`** permission to proceed!"}});
        }
        if (!permissions.has("SPEAK")) {
            return message.channel.send({embed: {color: "RED", description: "Sorry, but I need a **`SPEAK`** permission to proceed!"}});
        }
        if (!url || !searchString) return message.channel.send({embed: {color: "RED", description: "Please input link/title to search music"}});
        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, message, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return message.channel.send({embed: {
                color: "GREEN",
                description: `✅  **|**  Playlist: **\`${playlist.title}\`** has been added to the queue`
            }});
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                    let embedPlay = new MessageEmbed()
                        .setColor("BLUE")
                        .setAuthor("Search results", message.author.displayAvatarURL())
                        .setDescription(`${videos.map(video2 => `**\`${++index}\`  |**  ${video2.title}`).join("\n")}`)
                        .setFooter("Please choose one of the following 10 results, this embed will auto-deleted in 1 minute");
                    // eslint-disable-next-line max-depth
                    message.channel.send(embedPlay).then(m => m.delete({
                        timeout: 100000 //Kataka
                    }))
                    try {
                        var response = await message.channel.awaitMessages(message2 => message2.content > 0 && message2.content < 11, {
                            max: 1,
                            time: 100000, //Kataka
                            errors: ["time"]
                        });
                    } catch (err) {
                        console.error(err);
                        return message.channel.send({embed: {
                            color: "RED",
                            description: "The song selection time has expired in 1 minute, the request has been canceled."
                        }});
                    }
                    const videoIndex = parseInt(response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                } catch (err) {
                    console.error(err);
                    return message.channel.send({embed: {color: "RED", description: ":x: **No matches**"}});
                }
            }
            response.delete();
            return handleVideo(video, message, voiceChannel);
        }

    } else if (command === "skip") {
        if (!message.member.voice.channel) return message.channel.send({embed: {color: "RED", description: ":x: **You have to be in a voice channel to use this command.**"}});
        if (!serverQueue) return message.channel.send({embed: {color: "RED", description: ":x:**Nothing playing in this server**"}});
        serverQueue.connection.dispatcher.end("[runCmd] Skip command has been used");
        return message.channel.send({embed: {color: "GREEN", description: ":fast_forward: **Skipped** :thumbsup:"}});

    } else if (command === "stop") {
        if (!message.member.voice.channel) return message.channel.send({embed: {color: "RED", description: ":x: **You have to be in a voice channel to use this command.**"}});
        if (!serverQueue) return message.channel.send({embed: {color: "RED", description: ":x:**Nothing playing in this server**"}});
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end("[runCmd] Stop command has been used");
        return message.channel.send({embed: {color: "GREEN", description: "⏹️ **Stopped**"}});

    } else if (command === "volume" || command === "vol") {
        if (!message.member.voice.channel) return message.channel.send({embed: {color: "RED", description: ":x: **You have to be in a voice channel to use this command.**"}});
        if (!serverQueue) return message.channel.send({embed: {color: "RED", description: ":x:**Nothing playing in this server**"}});
        if (!args[1]) return message.channel.send({embed: {color: "BLUE", description: `The current volume is: **\`${serverQueue.volume}%\`**`}});
        if (isNaN(args[1]) || args[1] > 100) return message.channel.send({embed: {color: "RED", description: "Volume only can be set in a range of **\`1\`** - **\`100\`**"}});
        serverQueue.volume = args[1];
        serverQueue.connection.dispatcher.setVolume(args[1] / 100);
        return message.channel.send({embed: {color: "GREEN", description: `I set the volume to: **\`${args[1]}%\`**`}});

    } else if (command === "nowplaying" || command === "np") {
        if (!serverQueue) return message.channel.send({embed: {color: "RED", description: ":x:**Nothing playing in this server**"}});
        return message.channel.send({embed: {color: "BLUE", description: `🎶  **|**  Now Playing: **\`${serverQueue.songs[0].title}\`**`}});

    } else if (command === "queue" || command === "q") {
        if (!serverQueue) return message.channel.send({embed: {color: "RED", description: ":x:**Nothing playing in this server**"}});
        let embedQueue = new MessageEmbed()
            .setColor("BLUE")
            .setAuthor("Song queue", message.author.displayAvatarURL())
            .setDescription(`${serverQueue.songs.map(song => `**-** ${song.title}`).join("\n")}`)
            .setFooter(`• Now Playing: ${serverQueue.songs[0].title}`);
        return message.channel.send(embedQueue);

    } else if (command === "pause") {
        if (serverQueue && serverQueue.playing) {
            serverQueue.playing = false;
            serverQueue.connection.dispatcher.pause();
            return message.channel.send({embed: {color: "GREEN", description: "⏸  **Paused** :thumbsup:"}});
        }
        return message.channel.send({embed: {color: "RED", description: ":x:**Nothing playing in this server**"}});

    } else if (command === "resume") {
        if (serverQueue && !serverQueue.playing) {
            serverQueue.playing = true;
            serverQueue.connection.dispatcher.resume();
            return message.channel.send({embed: {color: "GREEN", description: ":play_pause: **Resuming** :thumbsup: "}});
        }
        return message.channel.send({embed: {color: "RED", description: ":x:**Nothing playing in this server**"}});
    } else if (command === "loop") {
        if (serverQueue) {
            serverQueue.loop = !serverQueue.loop;
            return message.channel.send({embed: {color: "GREEN", description: `🔁  **|**  Loop is **\`${serverQueue.loop === true ? "enabled" : "disabled"}\`**`}});
        };
        return message.channel.send({embed: {color: "RED", description: ":x:**Nothing playing in this server**"}});
 } else if (command === "join" || command === "come" || command === "wara") { 
      // Join the same voice channel of the author of the message
    if (message.member.voice.channel) {
        const voiceChannel = await message.member.voice.channel;
                voiceChannel.join()
      message.channel.send("**Joined** :thumbsup:")
    } else {
      message.channel.send(":x: **You have to be in a voice channel to use this command.**")
    }
  } else if (command === "disconnect" || command === "leave" || command === "left" || command === "bro") {
    if(message.guild.me.voice.channel) {
      const voiceChannel = await message.guild.me.voice.channel;
      voiceChannel.leave()
      message.channel.send("Successfully Disconnected :thumbsup:")
    } else {
      message.channel.send(":x: **You have to be in a voice channel to use this command.**")
    }
  }
});

async function handleVideo(video, message, voiceChannel, playlist = false) {
    const serverQueue = queue.get(message.guild.id);
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };
    if (!serverQueue) {
        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 100,
            playing: true,
            loop: false
        };
        queue.set(message.guild.id, queueConstruct);
        queueConstruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(message.guild, queueConstruct.songs[0]); 
        } catch (error) {
            console.error(`[ERROR] I could not join the voice channel, because: ${error}`);
            queue.delete(message.guild.id);
            return message.channel.send({embed: {color: "RED", description: `I could not join the voice channel, because: **\`${error}\`**`}});
        }
    } else {
        serverQueue.songs.push(song);
        if (playlist) return;
        else return message.channel.send({embed: {color: "GREEN", description: `✅  **|**  **\`${song.title}\`** has been added to the queue`}});
    }
    return;
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.voiceChannel.leave();
        return queue.delete(guild.id);
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url))
        .on("finish", () => {
            const shiffed = serverQueue.songs.shift();
            if (serverQueue.loop === true) {
                serverQueue.songs.push(shiffed);
            };
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolume(serverQueue.volume / 100);

    serverQueue.textChannel.send({
        embed: {//nawi gorani = ${song.title}
            color: "BLUE",
            description: `🎶  **|**  Start Playing: **\`${song.title}\`**`
        }
    });
}

bot.login(process.env.BOT_TOKEN);
