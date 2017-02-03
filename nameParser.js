function Video(torrent_name) {
    //Propietés
    this.nom = null;
    this.qualVideo = null;
    this.codecVideo = null;
    this.qualAudio = null;
    this.qualSouro = null;
    this.sousTitre = null;
    this.qualSousTitre = null;
    this.langue = null;
    this.annee = null;
    this.type = null;
    this.episode = null;
    this.saison = null;
    this.format_saiepi = null;
    this.estSpecial = null;
    this.estFinal = null;
    this.format = null;

    //Fonction
    var torrent = torrent_name.toLowerCase();
    this.definirFormat(torrent);
    this.definirSerie(torrent);
    this.definirAnnee(torrent);
    this.definirQualite(torrent);
    this.definirLangue(torrent);
    this.definirNom(torrent);

    //Retour
    if (this.type != null && this.nom != null && this.format != null) {
        var retour = {
            type: this.type,
            nom: this.nom,
            format: this.format
        };

        if (this.saison != null) {
            retour.saison = this.saison;
        }
        if (this.episode != null) {
            retour.episode = this.episode;
        }
        if (this.qualVideo != null) {
            retour.qualVideo = this.qualVideo;
        }
        if (this.codecVideo != null) {
            retour.codecVideo = this.codecVideo;
        }
        if (this.qualAudio != null) {
            retour.qualAudio = this.qualAudio;
        }
        if (this.qualSouro != null) {
            retour.qualSouro = this.qualSouro;
        }
        if (this.sousTitre != null) {
            retour.sousTitre = this.sousTitre;
        }
        if (this.qualSousTitre != null) {
            retour.qualSousTitre = this.qualSousTitre;
        }
        if (this.langue != null) {
            retour.langue = this.langue;
        }
        if (this.annee != null) {
            retour.annee = this.annee;
        }
        if (this.estSpecial != null) {
            retour.estSpecial = this.estSpecial;
        }
        if (this.estFinal != null) {
            retour.estFinal = this.estFinal;
        }

        return retour;
    }
}

Video.prototype.definirFormat = function(torrent) {
    this.format = torrent.split('.').pop();
}

Video.prototype.definirSerie = function(torrent) {
    var reg_s01e01 = /(s)(\d{1,2})(e)(\d{1,2})/i;
    var reg_1x01 = /(\d{1,2})(x)(\d{2})/i;
    var reg_s1_e1 = /(s)(\d{1,2})( )(e)(\d{1,2})/i
    var result;

    if (reg_s01e01.test(torrent)) {
        result = reg_s01e01.exec(torrent);
        this.format_saiepi = reg_s01e01;
        this.type = "Série TV";
        this.saison = parseInt(result[2]);
        this.episode = parseInt(result[4]);
    } else if (reg_1x01.test(torrent)) {
        result = reg_1x01.exec(torrent);
        this.format_saiepi = reg_1x01;
        this.type = "Série TV";
        this.saison = parseInt(result[1]);
        this.episode = parseInt(result[3]);
    } else if (reg_s1_e1.test(torrent)) {
        result = reg_s1_e1.exec(torrent);
        this.format_saiepi = reg_s1_e1;
        this.type = "Série TV";
        this.saison = parseInt(result[2]);
        this.episode = parseInt(result[5]);
    } else {
        this.type = "Film";
    }

    if (this.type == "Série TV") {
        if (torrent.indexOf('final') != -1) {
            this.estFinal = true;
        }

        if (this.episode == 0 || torrent.indexOf('special') != -1) {
            this.estSpecial = true;
        }
    }
};

Video.prototype.definirAnnee = function(torrent) {
    if (this.type == "Film") {
        var reg = /(19[2-9][0-9])|(20[0-9]{2})/i
        if (reg.test(torrent)) {
            this.annee = parseInt(reg.exec(torrent)[0]);
        }
    }
};

Video.prototype.definirLangue = function(torrent) {
    var soustitres = ["vosten", "vostfr", "vost"];
    var qualSub = ["subforced", "hardsub", "subbed", "fastsub",
        "horriblesub"
    ];
    var langues = ["vo", "multi", "truefrench", "french", "vff",
        "vfq", "vfb", "vq", "vf"
    ];

    var vid = this;

    soustitres.some(function(elem) {
        if (torrent.indexOf(elem) != -1) {
            vid.sousTitre = elem;
            return true;
        }
    });

    qualSub.some(function(elem) {
        if (torrent.indexOf(elem) != -1) {
            vid.qualSousTitre = elem;
            return true;
        }
    });

    langues.forEach(function(elem) {
        if (torrent.indexOf(elem) != -1) {
            if (vid.langue == null) {
                vid.langue = Array();
            }
            vid.langue.push(elem);
        }
    });
};

Video.prototype.definirQualite = function(torrent) {
    var qualVideo = ["720p", "1080p", "hdrip", "blueray", "bdrip", "brrip",
        "bluray", "dvdrip", "webrip", "web-rip", "webdl", "web-dl",
        "hdtv", "web", "tvrip", "dvdscr", "ts", "cam"
    ];
    var codecVideo = ["x263", "h263", "h.263", "x264", "h264", "h.264", "avc",
        "x265", "h265", "h.265", "hevc"
    ];
    var qualAudio = ["thx", "dts", "ac3", "aac"];
    var qualSouro = ["7.1", "5.1", "3.1", "stereo"];

    var vid = this;

    qualVideo.some(function(elem) {
        if (torrent.indexOf(elem) != -1) {
            vid.qualVideo = elem;
            return true;
        }
    });
    codecVideo.some(function(elem) {
        if (torrent.indexOf(elem) != -1) {
            vid.codecVideo = elem;
            return true;
        }
    });

    qualAudio.some(function(elem) {
        if (torrent.indexOf(elem) != -1) {
            vid.qualAudio = elem;
            return true;
        }
    });

    qualSouro.some(function(elem) {
        if (torrent.indexOf(elem) != -1) {
            vid.qualSouro = elem;
            return true;
        }
    });
};

Video.prototype.definirNom = function(torrent) {
    var nomTemp = torrent.split(this.premier(torrent))[0];

    var reg = /_|\.|\+|\(|\)|-/g;
    nomTemp = nomTemp.replace(reg, " ");

    reg = / {2,}/g;
    nomTemp = nomTemp.replace(reg, " ");

    reg = /^\[\w{1,}]/g;
    nomTemp = nomTemp.replace(reg, " ");

    while (nomTemp[0] == " ") {
        nomTemp = nomTemp.substr(1);
    }
    while (nomTemp[nomTemp.length - 1] == " ") {
        nomTemp = nomTemp.substr(0, nomTemp.length - 1);
    }

    if (nomTemp != '') {
        nomTemp = nomTemp.split(" ");
        nomFinal = Array();
        nomTemp.forEach(function(elem) {
            if (elem.length > 1) {
                nomFinal.push(elem[0].toUpperCase() + elem.substr(1));
            } else {
                nomFinal.push(elem[0].toUpperCase());
            }
        });

        this.nom = nomFinal.join(" ");
    }
};

Video.prototype.premier = function(fichier) {
    if (this.type != null) {
        var l = [this.qualVideo, this.qualAudio, this.qualSouro,
            this.sousTitre, this.qualSousTitre, this.annee
        ];
        if (this.langue != null) {
            this.langue.forEach(function(elem) {
                l.push(elem);
            });
        }
        var prems = null;
        var ind_min = fichier.length;

        l.forEach(function(elem) {
            if (elem != null) {
                var ind = fichier.indexOf(elem);
                if (ind < ind_min) {
                    ind_min = ind;
                    prems = elem;
                }
            }
        });

        if (this.type == "Série TV") {
            var match = this.format_saiepi.exec(fichier);
            if (match.index < ind_min) {
                ind_min = match.index;
                prems = match[0];
            }
        }

        return prems;
    }
};

module.exports = Video;
