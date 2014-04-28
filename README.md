# mp3-concat
A transform stream that you write several mp3 files to and transforms
them into *one single* mp3 file.

Just make sure, that you've got [mp3cat](http://tomclegg.net/mp3cat) installed
and available in your `PATH`

## example
```js
var fs = require('fs');
var async = require('async');
var concatstream = require('mp3-concat');

// Create the concat stream
var concatenater = concatstream();

// Pipe the output to a 'concat.mp3' file
concatenater.pipe(fs.createWriteStream('concat.mp3'));

// Loop through the files in series
async.eachSeries(['file1.mp3', 'file2.mp3'], function(file, cb) {
  // ... and pipe them into the concatenater
  fs
    .createReadStream(file)
    .on('end', cb)
    .pipe(concatenater, { end: false });
}, function() {
  // Finally, when all files have been read, close the stream
  concatenater.end();  
});
```

## events

### `.on('offset', cb({ duration: [Number], offset: [Number] }))`

This event is emitted per input stream. `duration` is the calculated duration
of the file/stream resource, while offset is its position in the concatenated
file. Both numbers are in seconds.

### `.on('error', cb({ rawError: [Error], reason: [String] })`

This event is fired when there's trouble spawning `mp3cat`. This is most
probably because you forgot to install it and add it to your `PATH`.
