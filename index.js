var fs = require('fs'),
  util = require('util'),
  spawn = require('child_process').spawn,
  Transform = require('readable-stream').Transform;

// Version: 0 = 2.5, 1 = reserved, 2 = 2, 3 = 1
// Layers:  0 = reserved, 1 = III, 2 = II, 3 = I
var v1SamplesPrFrame = [384, 1152, 1152]; // MPEG Version 1
var v2SamplesPrFrame = [384, 1152, 576]; // MPEG Version 2 & 2.5

util.inherits(MP3Concatenater, Transform);
function MP3Concatenater(options) {
  if (!(this instanceof MP3Concatenater))
    return new MP3Concatenater(options);

  Transform.call(this, options);
  this._mp3cat = null;
  this._metadataBuffer = '';
  this._offset = 0;
  this._finalCallback = function() {};

  this._setup();
}

MP3Concatenater.prototype._transform = function(chunk, encoding, cb) {
  // Just write input data directly to mp3cat
  this._mp3cat.stdin.write(chunk, encoding, cb);
};

MP3Concatenater.prototype._setup = function() {
  // Spawn the process with verbose flag, reading from stdin
  this._mp3cat = spawn('mp3cat', ['-v', '-', '-']);
  // throw if mp3cat failed to start up
  this._mp3cat.on('error', function(e) {
    this.emit('error', {
      rawError: e,
      reason: 'Couldn\'t execute mp3cat - Make sure that you\'ve got it ' +
      'installed and ready to go.\nhttp://tomclegg.net/mp3cat'
    });
  }.bind(this));
  // Metadata information
  this._mp3cat.stderr.on('data', this._handleMetadata.bind(this));
  // Data output
  this._mp3cat.stdout.on('data', this.push.bind(this));
  // Make sure to call the last _flush callback
  this._mp3cat.stdout.on('end', function() {
    this._finalCallback();
  }.bind(this));
};

// _flush gets called when the client *actively* calls MP3Concatenater.end()
// This lets us close the stdin of mp3cat and thus close the entire stream
MP3Concatenater.prototype._flush = function(cb) {
  this._mp3cat.stdin.end();
  this._finalCallback = cb;
};

// Parses and emits the offset of each stream concatenated
MP3Concatenater.prototype._handleMetadata = function(chunk) {
  var buf = this._metadataBuffer += chunk.toString();
  var lines = buf.split('\n');
  var frames, version, layer, samplerate, i, length, line;
  for (i = 0, length = lines.length; i < length; i++) {
    line = lines.shift();

    if (line.match(/\d+\sframes/)) {
      frames = parseInt(line.split(' ').shift(), 10);
    } else if (line.indexOf('Found:') === 0) {
      version = parseInt(line.match(/version=(\d)\s/).pop(), 10);
      layer = parseInt(line.match(/layer=(\d)\s/).pop(), 10);
      samplerate = parseInt(line.match(/samplerate=(\d+)\s/).pop(), 10);
    }

    // Details about a complete file has been received
    if (frames && version && layer && samplerate) {
      var spf = (version === 3) ?
        v1SamplesPrFrame[3 - layer] : v2SamplesPrFrame[3 - layer];
      var dur = frames * (spf / samplerate);
      this.emit('offset', { duration: dur, offset: this._offset });
      this._offset += dur;
      break;
    }
  }

  this._metadataBuffer = lines.join('\n');
};

module.exports = MP3Concatenater;
