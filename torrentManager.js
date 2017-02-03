//Defin requirement
var schedule = require('node-schedule');
var t411 = require('t411');
var fs = require('fs');
var WebTorrent = require('webtorrent-hybrid');
var ffmpeg = require('fluent-ffmpeg');
var parseTorrent = require('parse-torrent');
var nameParser = require('./nameParser');

//Default t411 account
var client = new t411();
//Defaut path for DL
var path = './torrents/downloads/';
//cache
var cache = Array();

module.exports.cache = cache;

//Prety print file size from https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable
function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}

function download(t411Id, user, pass, callback, onProgress) {
    //Connecting to t411
    console.log('connecting to T411');
    client.auth(user, pass, function(err) {
        if (err) {
            console.log('Unable to connect to t411 with username:', user, 'and password:', pass);
            console.log(err);
            return;
        }

        //Downloading .torrent
        console.log('Downloading the .torrent file')
        client.download(t411Id, function(err, buf) {
            if (err) {
                console.log('Unable to download torrentID', t411Id);
                console.log(err);
                return;
            }

            //Here the big thing
            var wt = new WebTorrent();
            var parsedTorrent = parseTorrent(buf);
            var areAllDownloaded = true;

            parsedTorrent.files.some(function(elem) {
                var dlFile = path + elem.name;
                if (!fs.existsSync(dlFile) || fs.statSync(dlFile) != elem.length) {
                    areAllDownloaded = false;
                    return;
                }

                callback(dlFile);

                console.log('File', elem.name, 'is already downloaded');
            });

            if (!areAllDownloaded) {
                //Downloading torrent
                wt.add(buf, function(torrent) {
                    console.log('Downloading\n');

                    torrent.files.forEach(function(file, index) {
                        var dlFile = path + file.name;



                        if (!(fs.existsSync(dlFile) && fs.statSync(dlFile) == file.length)) {
                            //File is not downloaded
                            var source = file.createReadStream();
                            var destination = fs.createWriteStream(dlFile);

                            torrent.on('download', function() {
                                onProgress('Téléchargement: ' + Math.floor(torrent.progress * 100) + '% (' + humanFileSize(torrent.downloadSpeed, true) + '/s)');
                                process.stdout.write('Downloaded ' + Math.floor(torrent.progress * 100) + '% at ' + humanFileSize(torrent.downloadSpeed, true) + '/s\r');
                            });

                            source.on('end', function() {
                                callback(dlFile);
                            }).pipe(destination);
                        }
                    });
                });
            }
        });
    });
}

module.exports.download = download;

function seed(file, urls, cron, callback) {
    //Here the big thing
    var wt = new WebTorrent();

    wt.seed(file, {
        announce: urls
    }, function(torrent) {
        console.log('File is seeding');

        schedule.scheduleJob(cron, function() {
            for (var i = 0; i < cache.length; i++) {
                if (cache[i].magnet == torrent.magnetURI) {
                    cache.splice(i, 1);
                }
            }
            wt.remove(torrent.magnetURI);
        });
    });

    wt.on('torrent', function(torrent) {
        console.log('Magnet URI ready');
        callback(torrent.magnetURI);
    });
}

module.exports.seed = seed;

function convert(file, callback, onProgress) {
    var fileMp4 = file.substr(0, file.length - file.split('.').pop().length) + 'mp4';

    if (fs.existsSync(fileMp4)) {
        return ffmpeg.ffprobe(fileMp4, function(err, metadata) {
            var audioCodec = null;
            var videoCodec = null;

            if (metadata) {
                metadata.streams.forEach(function(stream) {
                    if (stream.codec_type === "video")
                        videoCodec = stream.codec_name;
                    else if (stream.codec_type === "audio")
                        audioCodec = stream.codec_name;
                });
            }

            if (audioCodec.toLowerCase() == 'aac') {
                return callback(fileMp4);
            }
        });
    }

    return ffmpeg.ffprobe(file, function(err, metadata) {
        var audioCodec = null;
        var videoCodec = null;

        if (metadata) {
            metadata.streams.forEach(function(stream) {
                if (stream.codec_type === "video")
                    videoCodec = stream.codec_name;
                else if (stream.codec_type === "audio")
                    audioCodec = stream.codec_name;
            });
        }

        return ffmpeg(file)
            .input(fs.createReadStream(file))
            .videoCodec('copy')
            .audioCodec(audioCodec.toLowerCase() == 'aac' ? 'copy' : 'aac')
            .outputOptions('-movflags +faststart')
            .output(fileMp4)
            .on('progress', function(progress) {
                onProgress('Conversion: ' + Math.floor(progress.percent) + '%    (' + progress.currentFps + 'fps)');
                process.stdout.write('Progress: ' + Math.floor(progress.percent) + '%    Transcoding at ' + progress.currentFps + 'fps\r');
            }).on('end', function() {
                return callback(fileMp4);
            }).run();
    });

}

var ffmpeg = require('fluent-ffmpeg');

module.exports.convert = convert;
