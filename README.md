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
