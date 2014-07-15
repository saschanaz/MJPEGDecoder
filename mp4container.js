var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/*
W3C ISO BMFF Byte Stream Format
ISO/IEC 14496-12:2012(E)
*/
var MP4Container;
(function (MP4Container) {
    //numbers are big endianed
    //4.2 Object Structure
    var Box = (function () {
        function Box(boxType, extendedType) {
            this.type = boxType;
        }
        Box.prototype.getByteLength = function () {
            return 4;
            //0 and 1 are special values
        };
        return Box;
    })();
    MP4Container.Box = Box;
    var FullBox = (function (_super) {
        __extends(FullBox, _super);
        function FullBox(boxType, version) {
            _super.call(this, boxType);
            this.version = version;
            this.flags = 0;
        }
        FullBox.prototype.getByteLength = function () {
            return _super.prototype.getByteLength.call(this) + 1 + 3;
        };
        return FullBox;
    })(Box);
    MP4Container.FullBox = FullBox;

    //class UuidBox extends Box {
    //    userType = new Uint8Array(16);
    //    constructor() {
    //        super("uuid");
    //    }
    //}
    /*
    W3C 3. Initialization Segments
    
    An ISO BMFF initialization segment is defined in this specification as
    a single File Type Box (ftyp) followed by a single Movie Header Box (moov).
    
    Valid top-level boxes such as pdin, free, and sidx ...
    ... other than ftyp, moov, styp, moof, and mdat ...
    ... ignored by the user agent and are not considered part of the
    initialization segment in this specification.
    
    ISO/IEC 6.2.3 Box Order
    */
    // ISO/IEC 4.3
    var FileTypeBox = (function (_super) {
        __extends(FileTypeBox, _super);
        function FileTypeBox() {
            _super.call(this, "ftyp");
            this.majorBrand = "mp41";
            this.majorVersion = 0;
            this.compatibleBrands = ["mp41"];
        }
        FileTypeBox.prototype.getByteLength = function () {
            return _super.prototype.getByteLength.call(this) + 4 + 4 + 4;
        };
        return FileTypeBox;
    })(Box);
    MP4Container.FileTypeBox = FileTypeBox;

    //ISO/IEC 8.2.1
    var MovieBox = (function (_super) {
        __extends(MovieBox, _super);
        function MovieBox() {
            _super.call(this, "moov");
        }
        return MovieBox;
    })(Box);
    MP4Container.MovieBox = MovieBox;

    //ISO/IEC 8.8.4
    var MovieFragmentBox = (function (_super) {
        __extends(MovieFragmentBox, _super);
        function MovieFragmentBox(boxes) {
            _super.call(this, "moof");
            this.boxes = boxes;
        }
        MovieFragmentBox.prototype.getByteLength = function () {
            var byteLength = _super.prototype.getByteLength.call(this) + this.boxes.movieFragmentHeader.getByteLength();
            if (this.boxes.trackFragment)
                byteLength += this.boxes.trackFragment.getByteLength();
            return byteLength;
        };
        return MovieFragmentBox;
    })(Box);
    MP4Container.MovieFragmentBox = MovieFragmentBox;

    //ISO/IEC 8.8.5
    var MovieFragmentHeaderBox = (function (_super) {
        __extends(MovieFragmentHeaderBox, _super);
        function MovieFragmentHeaderBox() {
            _super.call(this, "mfhd", 0);
        }
        MovieFragmentHeaderBox.prototype.getByteLength = function () {
            return _super.prototype.getByteLength.call(this) + 4;
        };
        return MovieFragmentHeaderBox;
    })(FullBox);
    MP4Container.MovieFragmentHeaderBox = MovieFragmentHeaderBox;

    //ISO/IEC 8.8.6
    var TrackFragmentBox = (function (_super) {
        __extends(TrackFragmentBox, _super);
        function TrackFragmentBox(boxes) {
            _super.call(this, "traf");
            this.boxes = boxes;
        }
        return TrackFragmentBox;
    })(Box);
    MP4Container.TrackFragmentBox = TrackFragmentBox;

    //ISO/IEC 8.8.7
    var TrackFragmentHeaderBox = (function (_super) {
        __extends(TrackFragmentHeaderBox, _super);
        function TrackFragmentHeaderBox(tfFlags) {
            _super.call(this, "tfhd", 0);
            this.tfFlags = tfFlags;
        }
        Object.defineProperty(TrackFragmentHeaderBox.prototype, "flagBits", {
            get: function () {
                return this.tfFlags.getFlagBits();
            },
            enumerable: true,
            configurable: true
        });
        return TrackFragmentHeaderBox;
    })(FullBox);
    MP4Container.TrackFragmentHeaderBox = TrackFragmentHeaderBox;
    var TrackFragmentHeaderFlags = (function () {
        function TrackFragmentHeaderFlags() {
        }
        TrackFragmentHeaderFlags.prototype.getFlagBits = function () {
            var flag = 0;
            if (this.baseDateOffsetPresent)
                flag |= 0x000001;
            if (this.sampleDescriptionIndexPresent)
                flag |= 0x000002;
            if (this.defaultSampleDurationPresent)
                flag |= 0x000008;
            if (this.defaultSampleSizePresent)
                flag |= 0x000010;
            if (this.defaultSampleFlagsPresent)
                flag |= 0x000020;
            if (this.durationIsEmpty)
                flag |= 0x010000;
            if (this.defaultBaseIsMoof)
                flag |= 0x020000;
            return flag;
        };
        return TrackFragmentHeaderFlags;
    })();
    MP4Container.TrackFragmentHeaderFlags = TrackFragmentHeaderFlags;
})(MP4Container || (MP4Container = {}));
//# sourceMappingURL=mp4container.js.map
