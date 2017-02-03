//API key:
// - theMovieDB
var THEMOVIEDB_KEY = '<tmdbApiKey>';
// - fanart.tv
var FANARTTV_KEY = '<fanartTVApiKey>';

//Requirement
var t411 = require('t411');
var movieDB = require('moviedb')(THEMOVIEDB_KEY);
var fanarttvAPI = require('fanarttv');
var nameParser = require('./nameParser');
var _ = require('lodash');

// Useful var:
//movie category id on t411
var movieID = ['455', '631', '635'];
//tv category id on t411
var tvID = ['637', '433'];
//Language for tmdb search
var lang = 'fr-FR';
//Append to TMDB request
var appened = 'videos';
//Search outputOptions
var searchOpt = {
    limit: 30
};
//fanarttv
var fanarttv = new fanarttvAPI(FANARTTV_KEY);

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

//Useful function
function parseAll(results, callback) {
    var parsedResults = {
        movies: [],
        series: []
    };

    results.forEach(function(elem) {
        if (_.includes(movieID, elem.category)) {
            var parsedInfo = new nameParser(elem.name);
            var toPush = elem;
            var checking = {
                name: parsedInfo.nom
            };

            toPush.parsedInfo = parsedInfo;
            toPush.size = humanFileSize(toPush.size);


            if (_.some(parsedResults.movies, checking)) {
                parsedResults.movies.some(function(elem2) {
                    if (elem2.name == parsedInfo.nom) {
                        elem2.t411.push(toPush);
                        return true;
                    }
                });
            } else {
                var struct = {
                    name: parsedInfo.nom,
                    t411: Array(toPush)
                }
                parsedResults.movies.push(struct);
            }
        } else if (_.includes(tvID, elem.category)) {
            var parsedInfo = new nameParser(elem.name);
            var toPush = elem;
            var checking = {
                name: parsedInfo.nom
            };

            toPush.parsedInfo = parsedInfo;
            toPush.size = humanFileSize(toPush.size);

            if (_.some(parsedResults.series, checking)) {
                parsedResults.series.some(function(elem2) {
                    if (elem2.name == parsedInfo.nom) {
                        elem2.t411.push(toPush);
                        return true;
                    }
                });
            } else {
                var struct = {
                    name: parsedInfo.nom,
                    t411: Array(toPush)
                }

                parsedResults.series.push(struct);
            }
        }
    });

    callback(parsedResults);
}

function getTMDB(parsedResults, callback) {
    var i = 0;
    var time = 0;
    var maxReq = 4;
    var waitTime = 1500;
    var timeout = 1000;
    var tmdbResults = parsedResults;

    tmdbResults.movies.forEach(function(elem) {
        setTimeout(function() {
            movieDB.searchMovie({
                query: elem.name,
                language: lang,
                page: 1
            }, function(err, res) {
                if (elem.name == null) {
                    return;
                }
                if (err) {
                    console.log('Error with the movie: ' + elem.name);
                    console.log('----------------------------------');
                    console.log(elem);
                    console.log(err);
                    return;
                }

                if (res.total_results && res.total_results > 0) {
                    elem.tmdb = res.results[0];
                    elem.name = res.results[0].title;
                } else {
                    _.remove(tmdbResults.movies, elem);
                }
            });
        }, time);
        i++;

        if (i % maxReq == 0) {
            time += waitTime;
        }
    });

    tmdbResults.series.forEach(function(elem) {
        setTimeout(function() {
            movieDB.searchTv({
                query: elem.name,
                language: lang,
                page: 1,
                append_to_response: appened
            }, function(err, res) {
                if (elem.name == null) {
                    return;
                }
                if (err) {
                    console.log('Error with the TV Show: ' + elem.name);
                    console.log('----------------------------------');
                    console.log(elem);
                    console.log(err);
                    return;
                }

                if (res.total_results && res.total_results > 0) {
                    elem.tmdb = res.results[0];
                    elem.name = res.results[0].name;
                } else {
                    _.remove(tmdbResults.series, elem);
                }
            });
        }, time);
        i++;

        if (i % maxReq == 0) {
            time += waitTime;
        }
    });

    setTimeout(function() {
        callback(tmdbResults);
    }, time + timeout);
}

function getFTV(tmdbResults, callback) {
    var i = 0;
    var time = 0;
    var maxReq = 20;
    var waitTime = 500;
    var timeout = 1000;

    var ftvResults = tmdbResults;
    _.remove(ftvResults.movies, function(elem) {
        if (!(elem.tmdb && elem.tmdb !== null)) {
            return true;
        }
    });

    _.remove(ftvResults.series, function(elem) {
        if (!(elem.tmdb && elem.tmdb !== null)) {
            return true;
        }
    });

    ftvResults.movies.forEach(function(elem) {
        setTimeout(function() {
            fanarttv.getImagesForMovie(elem.tmdb.id, function(err, res) {

                elem.ftv = res;
            });
        }, time);
        i++;

        if (i % maxReq == 0) {
            time += waitTime;
        }
    });

    ftvResults.series.forEach(function(elem) {
        setTimeout(function() {
            fanarttv.getImagesForTVShow(elem.tmdb.id, function(err, res) {

                elem.ftv = res;
            });
        }, time);
        i++;

        if (i % maxReq == 0) {
            time += waitTime;
        }
    });

    setTimeout(function() {
        callback(ftvResults);
    }, time + timeout);
}

function topToday() {
    this.cache = null;

    topToday.prototype.get = function(id, type) {
        if (id && id != null) {
            if (this.cache.movies && type == 'movie') {
                return _.find(this.cache.movies, function(elem) {
                    return elem.tmdb.id == id;
                });
            }

            if (this.cache.series && type == 'tvshow') {
                return _.find(this.cache.series, function(elem) {
                    return elem.tmdb.id == id;
                });
            }

            return null;
        }

        return this.cache;
    }

    topToday.prototype.set = function(content, callback) {
        this.cache = content;
    }

    topToday.prototype.update = function(user, password, callback) {
        var client = new t411();
        var t = this;

        client.auth(user, password, function(err) {
            if (err) {
                callback(err, null);
                return;
            } else {
                client.topToday(function(error, results) {
                    if (error) {
                        callback(error, null);
                        return;
                    } else {
                        parseAll(results, function(parsedResults) {
                            getTMDB(parsedResults, function(tmdbResults) {
                                getFTV(tmdbResults, function(ftvResults) {
                                    t.cache = ftvResults;

                                    callback(null, ftvResults);

                                });
                            });
                        });
                    }
                });
            }
        });
    }
}

module.exports.topToday = topToday;

function topWeek() {
    this.cache = null;

    topWeek.prototype.get = function(id, type) {
        if (id && id != null) {
            if (this.cache.movies && type == 'movie') {
                return _.find(this.cache.movies, function(elem) {
                    return elem.tmdb.id == id;
                });
            }

            if (this.cache.series && type == 'tvshow') {
                return _.find(this.cache.series, function(elem) {
                    return elem.tmdb.id == id;
                });
            }
        }

        return this.cache;
    }

    topWeek.prototype.set = function(content, callback) {
        this.cache = content;
    }

    topWeek.prototype.update = function(user, password, callback) {
        var client = new t411();
        var t = this;

        client.auth(user, password, function(err) {
            if (err) {
                callback(err, null);
                return;
            } else {
                client.topWeek(function(error, results) {
                    if (error) {
                        callback(error, null);
                        return;
                    } else {
                        parseAll(results, function(parsedResults) {
                            getTMDB(parsedResults, function(tmdbResults) {
                                getFTV(tmdbResults, function(ftvResults) {
                                    t.cache = ftvResults;

                                    callback(null, ftvResults);

                                });
                            });
                        });
                    }
                });
            }
        });
    }
}

module.exports.topWeek = topWeek;

function topMonth() {
    this.cache = null;

    topMonth.prototype.get = function(id, type) {
        if (id && id != null) {
            if (this.cache.movies && type == 'movie') {
                return _.find(this.cache.movies, function(elem) {
                    return elem.tmdb.id == id;
                });
            }

            if (this.cache.series && type == 'tvshow') {
                return _.find(this.cache.series, function(elem) {
                    return elem.tmdb.id == id;
                });
            }
        }

        return this.cache;
    }

    topMonth.prototype.set = function(content, callback) {
        this.cache = content;
    }

    topMonth.prototype.update = function(user, password, callback) {
        var client = new t411();
        var t = this;

        client.auth(user, password, function(err) {
            if (err) {
                callback(err, null);
                return;
            } else {
                client.topMonth(function(error, results) {
                    if (error) {
                        callback(error, null);
                        return;
                    } else {
                        parseAll(results, function(parsedResults) {
                            getTMDB(parsedResults, function(tmdbResults) {
                                getFTV(tmdbResults, function(ftvResults) {
                                    t.cache = ftvResults;

                                    callback(null, ftvResults);

                                });
                            });
                        });
                    }
                });
            }
        });
    }
}

module.exports.topMonth = topMonth;

function top100() {
    this.cache = null;

    top100.prototype.get = function(id, type) {
        if (id && id != null) {
            if (this.cache.movies && type == 'movie') {
                return _.find(this.cache.movies, function(elem) {
                    return elem.tmdb.id == id;
                });
            }

            if (this.cache.series && type == 'tvshow') {
                return _.find(this.cache.series, function(elem) {
                    return elem.tmdb.id == id;
                });
            }
        }

        return this.cache;
    }

    top100.prototype.set = function(content, callback) {
        this.cache = content;
    }

    top100.prototype.update = function(user, password, callback) {
        var client = new t411();
        var t = this;

        client.auth(user, password, function(err) {
            if (err) {
                callback(err, null);
                return;
            } else {
                client.top100(function(error, results) {
                    if (error) {
                        callback(error, null);
                        return;
                    } else {
                        parseAll(results, function(parsedResults) {
                            getTMDB(parsedResults, function(tmdbResults) {
                                getFTV(tmdbResults, function(ftvResults) {
                                    t.cache = ftvResults;

                                    callback(null, ftvResults);

                                });
                            });
                        });
                    }
                });
            }
        });
    }
}

module.exports.top100 = top100;

function search() {
    this.cache = {
        movies: [],
        series: []
    };;

    search.prototype.get = function(id, type) {
        if (id && id != null) {
            if (this.cache.movies && type == 'movie') {
                return _.find(this.cache.movies, function(elem) {
                    return elem.tmdb.id == id;
                });
            }

            if (this.cache.series && type == 'tvshow') {
                return _.find(this.cache.series, function(elem) {
                    return elem.tmdb.id == id;
                });
            }
        }

        return this.cache;
    }

    search.prototype.set = function(content, callback) {
        this.cache = content;
    }

    search.prototype.add = function(user, pass, query, callback) {
        var client = new t411();
        var t = this;

        client.auth(user, pass, function(err) {
            if (err) {
                callback(err, null);
                return;
            }

            client.search(query, searchOpt, function(error, results) {
                if (err) {
                    callback(error, null);
                    return;
                }

                parseAll(results.torrents, function(parsedResults) {
                    getTMDB(parsedResults, function(tmdbResults) {
                        getFTV(tmdbResults, function(ftvResults) {
                            t.cache = ftvResults;

                            callback(null, ftvResults);

                        });
                    });
                });
            });
        });
    }

    search.prototype.addById = function(user, pass, id, type, callback) {
        var client = new t411();
        var t = this;

        client.auth(user, pass, function(err) {
            if (err) {
                return callback(err, null);
            }

            if (type == 'movie') {
                movieDB.movieInfo({
                    language: lang,
                    id: id,
                    append_to_response: appened
                }, function(error, res) {
                    if (err) {
                        console.log('Can not find info for movie id', id);
                        console.log(error);
                        return callback(error, null);
                    }

                    client.search('"' + res.title + ' ' + res.release_date.split('-')[0] + '"|"' + res.original_title + '"', searchOpt, function(erro, results) {
                        if (erro) {
                            return callback(erro, null);
                        }

                        parseAll(results.torrents, function(parsedResults) {
                            var nextRes = parsedResults;

                            for (var i = 1; i < nextRes.movies.length; i++) {
                                nextRes.movies[i].t411.forEach(function(e) {
                                    nextRes.movies[0].t411.push(e);
                                });
                            }

                            nextRes.movies[0].tmdb = res;
                            movieDB.movieCredits({
                                id: id,
                                language: lang
                            }, function(err, out) {
                                if (err) {
                                    console.log('Error with the movie:', id);
                                    console.log('----------------------------------');
                                    console.log(out);
                                    console.log(err);
                                    return;
                                }

                                nextRes.movies[0].tmdb.credits = out;
                                nextRes.movies[0].tmdb.credits.castLen = out.cast.length < 6 ? out.cast.length : 6;
                                nextRes.movies[0].tmdb.credits.crewLen = out.crew.length < 6 ? out.crew.length : 6;

                                getFTV(nextRes, function(ftvResults) {
                                    t.cache = ftvResults;

                                    return callback(null, ftvResults);
                                });
                            });
                        });
                    });
                });
            }

            if (type == 'tvshow') {
                movieDB.tvInfo({
                    language: lang,
                    id: id,
                    append_to_response: appened
                }, function(error, res) {
                    if (err) {
                        console.log('Can not find info for tvshow id', id);
                        console.log(error);
                        return callback(error, null);
                    }

                    client.search(res.name, searchOpt, function(erro, results) {
                        if (erro) {
                            return callback(erro, null);
                        }

                        parseAll(results.torrents, function(parsedResults) {
                            var nextRes = parsedResults;
                            nextRes.series[0].tmdb = res;

                            movieDB.tvCredits({
                                id: id,
                                language: lang
                            }, function(err, out) {
                                if (err) {
                                    console.log('Error with the tvShow:', id);
                                    console.log('----------------------------------');
                                    console.log(out);
                                    console.log(err);
                                    return;
                                }

                                nextRes.series[0].tmdb.credits = out;
                                nextRes.series[0].tmdb.credits.castLen = out.cast.length < 6 ? out.cast.length : 6;
                                nextRes.series[0].tmdb.credits.crewLen = out.crew.length < 6 ? out.crew.length : 6;

                                getFTV(nextRes, function(ftvResults) {
                                    t.cache = ftvResults;

                                    return callback(null, ftvResults);
                                });
                            });
                        });
                    });
                });
            }

        });
    }
}

module.exports.search = search;
