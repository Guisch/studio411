//Define requirement
var express = require('express');
var schedule = require('node-schedule');
var fs = require('fs');
var http = require('http');
var https = require('https');
var io = require('socket.io');
var events = require('events');
var cache = require('./cacheT411');
var tm = require('./torrentManager');

//Routing server
var home = express();
var movie = express();
var tvShow = express();
var request = express();
var search = express();
//Cache
var topToday = new cache.topToday();
var topWeek = new cache.topWeek();
var topMonth = new cache.topMonth();
var top100 = new cache.top100();
var searchCache = new cache.search();
//Default t411 account
var user = '<user>'; //'net411x';
var pass = '<pass>'; //'plateforme_net411x';
var passkey = '<passkey>'
//
var videoExtension = ['mp4', 'mkv', 'webm', 'avi'];
var cronEndOfSeed = '* * */10 * *';
var serverBoot = true;
var announceUrls = [
    'http://t411.download/' + passkey + '/announce',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.webtorrent.io',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.fastcast.nz'
];


//Settings for express:
// set the view engine to ejs
home.set('view engine', 'ejs');
// - set the static folder to
home.use(express.static(__dirname + '/public'));

events.EventEmitter.prototype._maxListeners = 100;

http.createServer(function(req, res) {
    res.writeHead(301, {
        "Location": "https://" + req.headers['host'] + req.url
    });
    res.end();
}).listen(80);

var serv = https.createServer({
    key: fs.readFileSync("/etc/letsencrypt/live/studio411.tk/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/studio411.tk/fullchain.pem"),
    ca: fs.readFileSync("/etc/letsencrypt/live/studio411.tk/chain.pem")
}, home).listen(443)

io(serv).on('connection', function(socket) {
    console.log('new connection');

    socket.on('watch', function(t411Id) {
        for (var i = 0; i < tm.cache.length; i++) {
            if (tm.cache[i].id == t411Id) {
                socket.emit('finish', tm.cache[i].magnet);
                return;
            }
        }

        socket.emit('next', 'Téléchargement du film');
        tm.download(t411Id, user, pass, function(file) {
            var extension = file.toLowerCase().split('.').pop();
            if (videoExtension.indexOf(extension) != -1) {
                socket.emit('next', 'Téléchargement terminé ! Conversion du film pour le web');

                //TODO: Vérif si fileMP4 existe déjà

                tm.convert(file, function(fileMP4) {
                    socket.emit('next', 'Conversion terminé ! Préparation du film pour le seed');
                    tm.seed(fileMP4, announceUrls, cronEndOfSeed, function(magnetURI) {
                        socket.emit('next', 'Fichier seedé ! En route pour le stream !');
                        tm.cache.push({
                            id: t411Id,
                            magnet: magnetURI
                        });
                        socket.emit('finish', magnetURI);
                    });
                }, function(message) {
                    socket.emit('next', message);
                });
            }
        }, function(message) {
            socket.emit('next', message);
        });
    })
});

// -- Useful function
function getInfo(id, type, callback) {

    searchCache.addById(user, pass, id, type, function(err, result) {
        if (err) {
            console.log('Error when getting info for movie', id);
            console.log(err);
            return;
        }

        if (type == 'movie') {
            callback(result.movies[0]);
            return;
        }
        if (type == 'tvshow') {
            callback(result.series[0]);
            return;
        }
    });
}

function throttle(callback, delay) {
    var last;
    var timer;
    return function() {
        var context = this;
        var now = +new Date();
        var args = arguments;
        if (last && now < last + delay) {
            // le délai n'est pas écoulé on reset le timer
            clearTimeout(timer);
            timer = setTimeout(function() {
                last = now;
                callback.apply(context, args);
            }, delay);
        } else {
            last = now;
            callback.apply(context, args);
        }
    };
}

// -- Home --

//Index page (top today)
home.get('/', function(req, res) {
    res.render('pages/top', topToday.get());
});

//Top of the week
home.get('/topWeek', function(req, res) {
    res.render('pages/top', topWeek.get());
});

//Top of the month
home.get('/topMonth', function(req, res) {
    res.render('pages/top', topMonth.get());
});

//Top of the month
home.get('/top100', function(req, res) {
    res.render('pages/top', top100.get());
});

// -- Movie (/movie/) --

//Index page with theMovieDB id
movie.get('/:id', function(req, res) {
    if (!req.params.id) {
        res.redirect('/');
    }

    var movieInfo = getInfo(req.params.id, 'movie', function(movieInfo) {
        res.render('pages/movie', movieInfo);
    });
});

//Watching page
movie.get('/watch/:idT411', function(req, res) {
    if (!req.params.idT411) {
        res.redirect('/');
        return;
    }
    var idT411 = req.params.idT411;
    var rendering = {
        idT411: idT411,
        name: null
    };

    if (searchCache.get().movies.length > 0) {
        var isInSearch = searchCache.get().movies[0].t411.some(function(elem) {
            if (elem.id == idT411) {
                return true;
            }
        });

        if (isInSearch) {
            rendering.posterPath = searchCache.get().movies[0].tmdb.posterPath;
            rendering.name = searchCache.get().movies[0].tmdb.title;
        }
    }

    res.render('pages/watch', rendering);

});

//Routing:
home.use('/movie', movie);
home.use('/tvShow', tvShow);
home.use('/search', search);
home.use('/request', request);

// Initializing
//Init tops
console.log('Initializing toptoday !');
topToday.update(user, pass, function(err, res) {
    if (err) {
        console.log('Unable to initialized topToday :(');
        console.log(err);
        return;
    }
    console.log('topToday initialized !');

    console.log('Initializing topWeek !');
    topWeek.update(user, pass, function(err, res) {
        if (err) {
            console.log('Unable to initialized topWeek :(');
            console.log(err);
            return;
        }
        console.log('topWeek initialized !');

        console.log('Initializing topMonth !');
        topMonth.update(user, pass, function(err, res) {
            if (err) {
                console.log('Unable to initialized topMonth :(');
                console.log(err);
                return;
            }
            console.log('topMonth initialized !');

            console.log('Initializing top100 !');
            top100.update(user, pass, function(err, res) {
                if (err) {
                    console.log('Unable to initialized top100 :(');
                    console.log(err);
                    return;
                }
                console.log('top100 initialized !');
            });
        });
    });

});

//Set cron
schedule.scheduleJob('*/15 * * * *', function() {
    topToday.update(user, pass, function(err, res) {
        if (err) {
            console.log('Unable to connect to t411 with username:', user, 'and password:', pass);
            console.log(err);
            return;
        }

        console.log('topToday updated !');
    })
});
schedule.scheduleJob('0 0 * * *', function() {
    topWeek.update(user, pass, function(err, res) {
        if (err) {
            console.log('Unable to connect to t411 with username:', user, 'and password:', pass);
            console.log(err);
            return;
        }

        console.log('topWeek updated !');
    })
});
schedule.scheduleJob('5 0 * * *', function() {
    topMonth.update(user, pass, function(err, res) {
        if (err) {
            console.log('Unable to connect to t411 with username:', user, 'and password:', pass);
            console.log(err);
            return;
        }

        console.log('topMonth updated !');
    })
});
schedule.scheduleJob('10 0 * * *', function() {
    top100.update(user, pass, function(err, res) {
        if (err) {
            console.log('Unable to connect to t411 with username:', user, 'and password:', pass);
            console.log(err);
            return;
        }

        console.log('top100 updated !');
    })
});
